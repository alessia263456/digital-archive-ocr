<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\FolderPermissionScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

final class ArchiveController
{
    public function __construct(private readonly FolderPermissionScope $permissions) {}

    public function browse(Request $request): JsonResponse
    {
        $query = $this->authorizedQuery($request->user());
        $groups = (clone $query)->select('document_type', DB::raw('count(*) as total'))
            ->groupBy('document_type')->orderBy('document_type')->get();
        $dossiers = (clone $query)->join('physical_dossiers as dossier', 'dossier.id', '=', 'archive_search_documents.physical_dossier_id')
            ->select('dossier.id', 'dossier.physical_dossier_number', DB::raw('count(*) as total'))
            ->groupBy('dossier.id', 'dossier.physical_dossier_number')->orderBy('dossier.physical_dossier_number')->get();
        $years = (clone $query)->whereNotNull('act_date')->selectRaw('EXTRACT(YEAR FROM act_date)::integer as year, count(*) as total')
            ->groupByRaw('EXTRACT(YEAR FROM act_date)')->orderBy('year')->get();
        $recent = (clone $query)
            ->join('physical_dossiers as dossier', 'dossier.id', '=', 'archive_search_documents.physical_dossier_id')
            ->join('document_versions as version', function ($join): void {
                $join->on('version.id', '=', 'archive_search_documents.version_id')->on('version.document_id', '=', 'archive_search_documents.document_id');
            })
            ->select('archive_search_documents.*', 'dossier.physical_dossier_number', 'version.version_number')
            ->selectRaw("'' as highlight")
            ->orderByDesc('archive_search_documents.approved_at')->orderBy('archive_search_documents.document_id')->limit(10)->get();

        return response()->json([
            'document_types' => $groups,
            'physical_dossiers' => $dossiers,
            'years' => $years,
            'recent' => $recent->map(fn (object $row): array => $this->result($row, $request->user())),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $parameters = $request->query();
        $user = $request->user();
        $unknown = array_diff(array_keys($parameters), ['q', 'physical_dossier_id', 'document_type', 'year', 'party', 'tag', 'page', 'per_page']);
        if ($unknown !== []) return $this->error(422, 'parametri_nevalizi', 'Parametrii de căutare nu sunt valizi.');
        if ($user->role === 'cititor' && (array_key_exists('party', $parameters) || array_key_exists('tag', $parameters) || array_key_exists('tags', $parameters))) {
            return $this->error(403, 'parametru_interzis', 'Parametrul solicitat nu este disponibil pentru acest rol.');
        }

        $validator = Validator::make($parameters, [
            'q' => 'sometimes|string|max:500',
            'physical_dossier_id' => 'sometimes|integer|min:1',
            'document_type' => 'sometimes|string|max:255',
            'year' => ['sometimes', 'regex:/^\d{4}$/'],
            'party' => 'sometimes|string|max:255',
            'tag' => 'sometimes|string|max:255',
            'page' => 'sometimes|integer|min:1|max:1000000',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);
        if ($validator->fails()) return $this->error(422, 'parametri_nevalizi', 'Parametrii de căutare nu sunt valizi.');
        $values = $validator->validated();
        $queryText = trim((string) ($values['q'] ?? ''));
        $isReader = $user->role === 'cititor';
        $textColumn = $isReader ? 'reader_text' : 'staff_text';
        $query = $this->authorizedQuery($user);
        if (isset($values['physical_dossier_id'])) $query->where('physical_dossier_id', (int) $values['physical_dossier_id']);
        if (isset($values['document_type'])) $query->where('document_type', $values['document_type']);
        if (isset($values['year'])) $query->whereYear('act_date', (int) $values['year']);
        if (isset($values['party'])) $query->whereRaw("staff_text ILIKE ?", ['%'.addcslashes($values['party'], '%_\\').'%']);
        if (isset($values['tag'])) $query->whereRaw("jsonb_exists(staff_metadata->'tags', ?)", [$values['tag']]);
        if ($queryText !== '') $query->whereRaw("to_tsvector('romanian', {$textColumn}) @@ websearch_to_tsquery('romanian', ?)", [$queryText]);

        $total = (clone $query)->count();
        $page = (int) ($values['page'] ?? 1);
        $perPage = (int) ($values['per_page'] ?? 20);
        $rank = $queryText === '' ? '0::real' : "ts_rank_cd(to_tsvector('romanian', {$textColumn}), websearch_to_tsquery('romanian', ?))";
        $select = 'archive_search_documents.*, dossier.physical_dossier_number, version.version_number';
        $startMarker = 'ZXQSTART'.str_replace('-', '', (string) Str::uuid());
        $stopMarker = 'ZXQSTOP'.str_replace('-', '', (string) Str::uuid());
        if ($queryText !== '') $select .= ', '.$rank.' as relevance, ts_headline(\'romanian\', '.$textColumn.', websearch_to_tsquery(\'romanian\', ?), \'StartSel='.$startMarker.',StopSel='.$stopMarker.',MaxFragments=2,MinWords=8,MaxWords=28\') as highlight';
        else $select .= ', '.$rank.' as relevance, \'\' as highlight';
        $query->join('physical_dossiers as dossier', 'dossier.id', '=', 'archive_search_documents.physical_dossier_id')
            ->join('document_versions as version', function ($join): void {
                $join->on('version.id', '=', 'archive_search_documents.version_id')->on('version.document_id', '=', 'archive_search_documents.document_id');
            })->selectRaw($select, $queryText === '' ? [] : [$queryText, $queryText])
            ->orderByRaw($queryText === '' ? 'approved_at DESC, document_id ASC' : 'relevance DESC, approved_at DESC, document_id ASC')
            ->offset(($page - 1) * $perPage)->limit($perPage);
        $rows = $query->get();

        return response()->json([
            'data' => $rows->map(fn (object $row): array => $this->result($row, $user, $startMarker, $stopMarker)),
            'meta' => ['current_page' => $page, 'per_page' => $perPage, 'total' => $total, 'last_page' => max(1, (int) ceil($total / $perPage))],
        ]);
    }

    private function authorizedQuery(User $user)
    {
        $query = DB::table('archive_search_documents');
        $ids = $this->permissions->dossierIds($user);
        if ($ids !== null) $query->whereIn('physical_dossier_id', $ids);
        return $query;
    }

    private function result(object $row, User $user, ?string $startMarker = null, ?string $stopMarker = null): array
    {
        $metadata = json_decode($user->role === 'cititor' ? $row->reader_metadata : $row->staff_metadata, true, flags: JSON_THROW_ON_ERROR);
        $data = [
            'document_id' => $row->document_id,
            'version_id' => $row->version_id,
            'version_number' => (int) ($row->version_number ?? 0),
            'document_type' => $row->document_type,
            'act_date' => $row->act_date,
            'act_number' => $metadata['act_number'] ?? null,
            'physical_dossier_number' => $row->physical_dossier_number ?? null,
            'inventory_number' => $metadata['inventory_number'] ?? null,
            'approved_at' => $row->approved_at,
            'highlight' => $this->safeHighlight((string) ($row->highlight ?? ''), $startMarker, $stopMarker),
        ];
        if (isset($row->relevance)) $data['relevance'] = round((float) $row->relevance, 6);
        if ($user->role !== 'cititor') $data['tags'] = $metadata['tags'] ?? [];
        return $data;
    }

    private function error(int $status, string $code, string $message): JsonResponse
    {
        return response()->json(['eroare' => $message, 'cod' => $code], $status);
    }

    private function safeHighlight(string $highlight, ?string $startMarker, ?string $stopMarker): string
    {
        if ($startMarker === null || $stopMarker === null) return '';
        return str_replace(
            [$startMarker, $stopMarker],
            ['<mark>', '</mark>'],
            htmlspecialchars($highlight, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
        );
    }
}
