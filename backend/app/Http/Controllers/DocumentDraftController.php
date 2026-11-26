<?php

namespace App\Http\Controllers;

use App\Models\DocumentDraft;
use App\Models\NomenclatureEntry;
use App\Jobs\ProcessDocumentDraft;
use App\Services\MetadataSuggestionExtractor;
use App\Services\DocumentDraftIntakeService;
use App\Services\DraftAccessLogger;
use App\Services\DocumentDraftPiiReview;
use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

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

    public function editor(Request $request, string $draft, DocumentDraftPiiReview $review, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->editorDraft($draft);
        if ($record instanceof JsonResponse) return $record;
        $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)->orderBy('page')->get();
        if ($pages->isEmpty()) return response()->json(['eroare' => 'Editorul nu este disponibil înainte de finalizarea OCR.'], 409);
        if ($record->corrected_ocr === null) {
            $record->corrected_ocr = $pages->map(fn ($page) => ['page' => (int) $page->page, 'text' => $page->text])->values()->all();
        }
        if ($record->detection_status !== 'ready' || (int) $record->detection_revision !== (int) $record->ocr_revision) {
            try {
                $record->pii_candidates = $review->detect($pages->all(), $record->corrected_ocr);
                $record->detection_revision = (int) $record->ocr_revision;
                $record->detection_status = 'ready';
                $record->save();
                $audit->record($request, $record, 'pii_detection_run');
            } catch (\Throwable $exception) {
                $record->pii_candidates = [];
                $record->detection_status = 'failed';
                $record->save();
                $audit->record($request, $record, 'pii_detection_failed');
            }
        } else {
            $record->save();
        }
        $audit->record($request, $record, 'editor_opened');
        return response()->json($this->editorPayload($record, $pages));
    }

    public function saveEditorOcr(Request $request, string $draft, DocumentDraftPiiReview $review, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->editorDraft($draft);
        if ($record instanceof JsonResponse) return $record;
        $validator = Validator::make($request->all(), [
            'ocr_revision' => 'required|integer|min:1',
            'pages' => 'required|array|min:1',
            'pages.*.page' => 'required|integer|min:1|distinct',
            'pages.*.text' => 'required|string|max:1000000',
        ]);
        if ($validator->fails()) return response()->json(['eroare' => 'Textul OCR sau versiunea trimisă nu sunt valide.'], 422);
        $inputPages = $validator->validated()['pages'];
        $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)->orderBy('page')->get();
        if ($pages->count() !== count($inputPages) || array_column($inputPages, 'page') !== $pages->pluck('page')->map(fn ($page) => (int) $page)->all()) {
            return response()->json(['eroare' => 'Trimiteți textul corectat pentru toate paginile, în ordinea documentului.'], 422);
        }
        [$record, $pages, $stale] = DB::transaction(function () use ($draft, $request, $inputPages, $audit): array {
            $record = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if ($record === null || $record->status !== 'review_ready' || !$record->ocr_extraction_id) return [null, collect(), true];
            if ((int) $request->input('ocr_revision') !== (int) $record->ocr_revision) return [$record, collect(), true];
            $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)->orderBy('page')->get();
            if ($pages->count() !== count($inputPages) || array_column($inputPages, 'page') !== $pages->pluck('page')->map(fn ($page) => (int) $page)->all()) return [$record, collect(), true];
            $record->corrected_ocr = array_map(static fn (array $page): array => ['page' => (int) $page['page'], 'text' => $page['text']], $inputPages);
            $record->ocr_revision = (int) $record->ocr_revision + 1;
            $record->detection_status = 'pending';
            $record->detection_revision = 0;
            $record->pii_candidates = [];
            $record->save();
            $audit->record($request, $record, 'ocr_corrections_saved');
            return [$record, $pages, false];
        });
        if ($stale || $record === null) return response()->json(['eroare' => 'Textul OCR sau ordinea paginilor s-au modificat. Reîncărcați editorul.'], 409);
        try {
            $record->pii_candidates = $review->detect($pages->all(), $record->corrected_ocr);
            $record->detection_revision = (int) $record->ocr_revision;
            $record->detection_status = 'ready';
            $current = DB::transaction(function () use ($draft, $record, $request, $audit): bool {
                $locked = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
                if ($locked === null || (int) $locked->ocr_revision !== (int) $record->ocr_revision) return false;
                $locked->pii_candidates = $record->pii_candidates;
                $locked->detection_revision = $record->detection_revision;
                $locked->detection_status = 'ready';
                $locked->save();
                $audit->record($request, $locked, 'pii_detection_run');
                return true;
            });
            if (!$current) return response()->json(['eroare' => 'Textul OCR s-a modificat între timp. Reîncărcați editorul.'], 409);
            $record->refresh();
        } catch (\Throwable $exception) {
            $failedCurrent = DB::transaction(function () use ($draft, $record, $request, $audit): bool {
                $locked = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
                if ($locked === null || (int) $locked->ocr_revision !== (int) $record->ocr_revision) return false;
                $locked->detection_status = 'failed';
                $locked->pii_candidates = [];
                $locked->save();
                $audit->record($request, $locked, 'pii_detection_failed');
                return true;
            });
            if (!$failedCurrent) return response()->json(['eroare' => 'Textul OCR s-a modificat între timp. Reîncărcați editorul.'], 409);
            return response()->json([
                'eroare' => 'Detectarea datelor personale a eșuat. Textul a fost salvat, dar rezultatele trebuie regenerate.',
                'detection_status' => 'failed', 'ocr_revision' => $record->ocr_revision,
            ], 500);
        }
        return response()->json($this->editorPayload($record, $pages));
    }

    public function reviewEditorPii(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->editorDraft($draft);
        if ($record instanceof JsonResponse) return $record;
        $validator = Validator::make($request->all(), [
            'ocr_revision' => 'required|integer|min:1',
            'detection_revision' => 'required|integer|min:0',
            'decisions' => 'required|array|min:1',
            'decisions.*.id' => 'required|uuid|distinct',
            'decisions.*.review_status' => 'required|in:accepted,rejected',
        ]);
        if ($validator->fails()) return response()->json(['eroare' => 'Deciziile de revizuire nu sunt valide.'], 422);
        if ($record->detection_status !== 'ready'
            || (int) $request->input('ocr_revision') !== (int) $record->ocr_revision
            || (int) $request->input('detection_revision') !== (int) $record->detection_revision) {
            return response()->json(['eroare' => 'Rezultatele de detectare s-au schimbat. Reîncărcați editorul înainte de revizuire.'], 409);
        }
        [$candidates, $changed] = DB::transaction(function () use ($draft, $request, $audit, $validator): array {
            $locked = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if ($locked === null || $locked->detection_status !== 'ready'
                || (int) $request->input('ocr_revision') !== (int) $locked->ocr_revision
                || (int) $request->input('detection_revision') !== (int) $locked->detection_revision) return [[], false];
            $candidates = $locked->pii_candidates ?? [];
            $byId = [];
            foreach ($candidates as $index => $candidate) $byId[$candidate['id']] = $index;
            foreach ($validator->validated()['decisions'] as $decision) {
                if (!isset($byId[$decision['id']])) return [[], false];
                $candidates[$byId[$decision['id']]]['review_status'] = $decision['review_status'];
            }
            $locked->pii_candidates = $candidates;
            $locked->save();
            $audit->record($request, $locked, 'pii_review_updated');
            return [$candidates, true];
        });
        if (!$changed) return response()->json(['eroare' => 'Rezultatele de detectare s-au schimbat. Reîncărcați editorul înainte de revizuire.'], 409);
        return response()->json(['candidates' => $candidates]);
    }

    private function editorDraft(string $id): DocumentDraft|JsonResponse
    {
        $record = DocumentDraft::query()->find($id);
        if ($record === null) return response()->json(['eroare' => 'Ciorna solicitată nu a fost găsită.'], 404);
        if ($record->status !== 'review_ready' || !$record->ocr_extraction_id) {
            return response()->json(['eroare' => 'Editorul nu este disponibil înainte de finalizarea OCR.'], 409);
        }
        return $record;
    }

    private function editorPayload(DocumentDraft $record, $pages): array
    {
        $corrected = collect($record->corrected_ocr ?? [])->keyBy('page');
        $candidates = $record->detection_status === 'ready' ? ($record->pii_candidates ?? []) : [];
        return [
            'id' => $record->id, 'status' => $record->status,
            'ocr_revision' => (int) $record->ocr_revision,
            'detection_status' => $record->detection_status,
            'detection_revision' => (int) $record->detection_revision,
            'pages' => $pages->map(fn ($page) => [
                'page' => (int) $page->page, 'width' => (int) $page->width, 'height' => (int) $page->height,
                'source_text' => $page->text, 'corrected_text' => $corrected->get((int) $page->page)['text'] ?? $page->text,
                'words' => json_decode($page->words, true, flags: JSON_THROW_ON_ERROR),
            ])->values()->all(),
            'candidates' => $candidates,
        ];
    }

    public function metadata(Request $request, string $draft, MetadataSuggestionExtractor $extractor, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->metadataDraft($draft);
        if ($record instanceof JsonResponse) {
            return $record;
        }

        if ($record->metadata_suggestions === null) {
            $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)
                ->orderBy('page')->get(['page', 'text'])
                ->map(static fn ($page) => ['page' => (int) $page->page, 'text' => $page->text])->all();
            $record->metadata_suggestions = $extractor->extract($pages);
            $record->save();
        }

        $audit->record($request, $record, 'metadata_viewed');

        return response()->json([
            'id' => $record->id,
            'suggestions' => $record->metadata_suggestions,
            'metadata' => $record->metadata ?? [],
            'metadata_confirmed' => $record->metadata_confirmed_at !== null,
            'classification' => $this->classificationData($record->nomenclatureEntry),
            'classification_options' => NomenclatureEntry::query()
                ->orderBy('document_type')->orderBy('subtype')->orderBy('storage_context')->get()
                ->map(fn (NomenclatureEntry $entry) => $this->classificationData($entry))->values(),
        ]);
    }

    public function updateMetadata(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->metadataDraft($draft);
        if ($record instanceof JsonResponse) {
            return $record;
        }

        $types = NomenclatureEntry::query()->distinct()->pluck('document_type')->all();
        $validator = Validator::make($request->all(), [
            'metadata' => 'required|array:act_date,act_number,physical_dossier_number,inventory_number,amount,contract_expiry,tags',
            'metadata.act_date' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.act_number' => 'sometimes|nullable|string|max:255',
            'metadata.physical_dossier_number' => 'sometimes|nullable|string|max:255',
            'metadata.inventory_number' => 'sometimes|nullable|string|max:255',
            'metadata.amount' => 'sometimes|nullable|string|max:255',
            'metadata.contract_expiry' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.tags' => 'sometimes|array',
            'metadata.tags.*' => ['string', 'max:255', Rule::in($types)],
            'nomenclature_entry_id' => 'sometimes|nullable|integer|exists:nomenclature_entries,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['eroare' => 'Metadatele sau clasificarea selectată nu sunt valide.'], 422);
        }

        $values = $validator->validated();
        $record->metadata = array_replace($record->metadata ?? [], $values['metadata']);
        if (array_key_exists('nomenclature_entry_id', $values)) {
            $record->nomenclature_entry_id = $values['nomenclature_entry_id'];
        }
        $record->metadata_confirmed_at = null;
        $record->save();
        $audit->record($request, $record, 'metadata_updated');

        return response()->json([
            'metadata' => $record->metadata,
            'metadata_confirmed' => false,
            'classification' => $this->classificationData($record->nomenclatureEntry),
        ]);
    }

    public function confirmMetadata(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->metadataDraft($draft);
        if ($record instanceof JsonResponse) {
            return $record;
        }

        $metadata = $record->metadata ?? [];
        foreach (['act_date', 'act_number', 'physical_dossier_number', 'inventory_number'] as $required) {
            if (! is_string($metadata[$required] ?? null) || trim($metadata[$required]) === '') {
                return response()->json([
                    'eroare' => 'Completați data actului, numărul actului, numărul dosarului fizic și numărul de inventar înainte de confirmare.',
                ], 422);
            }
        }
        if (! $record->nomenclature_entry_id || ! $record->nomenclatureEntry()->exists()) {
            return response()->json(['eroare' => 'Alegeți tipul, subtipul și contextul de arhivare înainte de confirmare.'], 422);
        }

        $record->metadata_confirmed_at = now();
        $record->save();
        $audit->record($request, $record, 'metadata_confirmed');

        return response()->json(['metadata_confirmed' => true]);
    }

    private function metadataDraft(string $id): DocumentDraft|JsonResponse
    {
        $record = DocumentDraft::query()->find($id);
        if ($record === null) {
            return response()->json(['eroare' => 'Ciorna solicitată nu a fost găsită.'], 404);
        }
        if ($record->status !== 'review_ready' || ! $record->ocr_extraction_id) {
            return response()->json(['eroare' => 'Metadatele nu sunt disponibile înainte de finalizarea OCR.'], 409);
        }
        return $record;
    }

    private function classificationData(?NomenclatureEntry $entry): ?array
    {
        if ($entry === null) {
            return null;
        }
        return [
            'id' => $entry->id,
            'document_type' => $entry->document_type,
            'subtype' => $entry->subtype,
            'storage_context' => $entry->storage_context,
            'archival_indicator' => $entry->archival_indicator,
        ];
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
