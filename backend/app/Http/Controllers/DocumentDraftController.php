<?php

namespace App\Http\Controllers;

use App\Models\DocumentDraft;
use App\Jobs\ProcessDocumentDraft;
use App\Services\DocumentDraftIntakeService;
use App\Services\DraftAccessLogger;
use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class DocumentDraftController
{
    public function store(Request $request, DocumentDraftIntakeService $intake): JsonResponse
    {
        $items = [];
        $errors = [];
        $documents = $request->file('documents', []);
        if (!is_array($documents)) {
            $documents = [$documents];
        }
        foreach ($documents as $index => $file) {
            $items[] = ['group' => 'documents', 'index' => $index] + $intake->acceptDocument($file);
        }
        if (!$this->uploadCountMatches($request, 'document_count', $documents)) {
            $errors[] = 'Unele documente nu au ajuns la server. Verificați rezultatele și retrimiteți doar documentele lipsă.';
        }

        $images = $request->file('images', []);
        if (!is_array($images)) {
            $images = [$images];
        }
        if (!array_is_list($images) || !$this->uploadCountMatches($request, 'image_count', $images)) {
            $errors[] = 'Colecția de imagini este incompletă. Retrimiteți toate paginile în ordinea dorită.';
        } elseif ($images !== []) {
            $items[] = ['group' => 'images'] + $intake->acceptImages($images);
        }

        if ($errors !== []) {
            return response()->json(['eroare' => implode(' ', $errors), 'items' => $items], 422);
        }

        if ($items === []) {
            return response()->json([
                'eroare' => 'Selectați cel puțin un document sau o colecție de imagini.',
            ], 422);
        }

        return response()->json(['items' => $items]);
    }

    private function uploadCountMatches(Request $request, string $field, array $files): bool
    {
        if (!$request->has($field)) {
            return true;
        }

        $expected = filter_var($request->input($field), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

        return $expected === count($files) && array_is_list($files);
    }

    public function recent(): JsonResponse
    {
        $drafts = DocumentDraft::query()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'original_names', 'status', 'created_at']);

        return response()->json([
            'drafts' => $drafts->map(static fn (DocumentDraft $record): array => [
                'id' => $record->id,
                'original_names' => $record->original_names,
                'status' => $record->status,
                'created_at' => $record->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function show(string $draft): JsonResponse
    {
        $record = DocumentDraft::query()->find($draft);
        if ($record === null) {
            return response()->json([
                'eroare' => 'Ciorna solicitată nu a fost găsită.',
            ], 404);
        }

        return response()->json([
            'id' => $record->id,
            'status' => $record->status,
        ]);
    }

    public function queue(): JsonResponse
    {
        $drafts = DocumentDraft::query()
            ->whereIn('status', ['review_ready', 'quarantined'])
            ->orderByDesc('created_at')
            ->get(['id', 'source_format', 'original_storage_keys', 'original_names', 'status', 'created_at']);

        $format = static fn (DocumentDraft $record): array => [
            'id' => $record->id,
            'status' => $record->status,
            'source_format' => $record->source_format,
            'name' => implode(', ', $record->original_names ?? array_map('basename', $record->original_storage_keys ?? [])),
            'created_at' => $record->created_at?->toIso8601String(),
        ];

        return response()->json([
            'review' => $drafts->where('status', 'review_ready')->map($format)->values(),
            'quarantine' => $drafts->where('status', 'quarantined')->map($format)->values(),
        ]);
    }

    public function retry(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        [$record, $changed] = DB::transaction(function () use ($request, $draft, $audit): array {
            $record = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if ($record === null) {
                return [null, false];
            }
            if ($record->status !== 'quarantined') {
                return [$record, false];
            }

            $record->status = 'queued';
            $record->ocr_extraction_id = null;
            $record->save();
            $audit->record($request, $record, 'retry_requested');
            ProcessDocumentDraft::dispatch($record->id);
            return [$record, true];
        });

        if ($record === null) {
            return response()->json(['eroare' => 'Ciorna solicitată nu a fost găsită.'], 404);
        }
        if (!$changed) {
            return response()->json(['eroare' => 'Documentul nu mai este în carantină. Reîncărcați coada.'], 409);
        }

        return response()->json(['id' => $record->id, 'status' => 'queued']);
    }

    public function permanentFailure(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        [$record, $changed] = DB::transaction(function () use ($request, $draft, $audit): array {
            $record = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if ($record === null) {
                return [null, false];
            }
            if ($record->status !== 'quarantined') {
                return [$record, false];
            }

            $record->status = 'failed_permanently';
            $record->save();
            $audit->record($request, $record, 'permanently_failed');
            return [$record, true];
        });

        if ($record === null) {
            return response()->json(['eroare' => 'Ciorna solicitată nu a fost găsită.'], 404);
        }
        if (!$changed) {
            return response()->json(['eroare' => 'Documentul nu mai este în carantină. Reîncărcați coada.'], 409);
        }

        return response()->json(['id' => $record->id, 'status' => 'failed_permanently']);
    }

    public function ocr(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        $record = DocumentDraft::query()->find($draft);
        if ($record === null) {
            return response()->json([
                'eroare' => 'Ciorna solicitată nu a fost găsită.',
            ], 404);
        }
        if ($record->status !== 'review_ready' || !$record->ocr_extraction_id) {
            return response()->json([
                'eroare' => 'Rezultatele OCR nu sunt încă disponibile. Actualizați starea și încercați din nou.',
            ], 409);
        }

        $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)
            ->orderBy('page')->get(['page', 'width', 'height', 'text', 'words']);
        if ($pages->isEmpty()) {
            return response()->json([
                'eroare' => 'Rezultatele OCR nu sunt încă disponibile. Actualizați starea și încercați din nou.',
            ], 409);
        }

        $audit->record($request, $record, 'ocr_results_viewed');

        return response()->json([
            'id' => $record->id,
            'status' => $record->status,
            'pages' => $pages->map(fn ($page) => [
                'page' => $page->page,
                'width' => $page->width,
                'height' => $page->height,
                'text' => $page->text,
                'words' => json_decode($page->words, true, flags: JSON_THROW_ON_ERROR),
            ])->values(),
        ]);
    }

    public function preview(Request $request, string $draft, DocumentStorageService $storage, DraftAccessLogger $audit): JsonResponse
    {
        $record = DocumentDraft::query()->find($draft);
        if ($record === null) {
            return response()->json(['eroare' => 'Ciorna solicitată nu a fost găsită.'], 404);
        }
        if ($record->status !== 'review_ready' || !$record->ocr_extraction_id) {
            return response()->json(['eroare' => 'Previzualizarea documentului nu este disponibilă.'], 409);
        }

        $keys = match ($record->source_format) {
            'docx' => $record->derived_pdf_storage_key ? [$record->derived_pdf_storage_key] : [],
            'pdf', 'image_collection' => $record->original_storage_keys ?? [],
            default => [],
        };
        if ($keys === [] || count($keys) !== count(array_filter($keys, fn ($key) => is_string($key) && $storage->exists($key)))) {
            return response()->json(['eroare' => 'Previzualizarea documentului nu este disponibilă.'], 409);
        }

        $expiresAt = now()->addMinutes(5);
        $audit->record($request, $record, 'preview_issued');
        $pages = array_map(fn ($key, $index) => [
            'page' => $index + 1,
            'kind' => $record->source_format === 'image_collection' ? 'image' : 'document',
            'url' => $storage->temporaryUrl($key, $expiresAt),
        ], $keys, array_keys($keys));

        return response()->json([
            'url' => $pages[0]['url'],
            'pages' => $pages,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }
}
