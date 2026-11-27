<?php

namespace App\Http\Controllers;

use App\Models\DocumentDraft;
use App\Models\NomenclatureEntry;
use App\Models\PhysicalDossier;
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
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Services\RedactedPdf;
use Symfony\Component\Process\Process;

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
            'pages.*.operations' => 'sometimes|array|max:10000',
            'pages.*.operations.*.start' => 'required|integer|min:0',
            'pages.*.operations.*.deleted' => 'present|string',
            'pages.*.operations.*.inserted' => 'present|string',
        ]);
        if ($validator->fails()) return response()->json(['eroare' => 'Textul OCR sau versiunea trimisă nu sunt valide.'], 422);
        $inputPages = $validator->validated()['pages'];
        $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)->orderBy('page')->get();
        if ($pages->count() !== count($inputPages) || array_column($inputPages, 'page') !== $pages->pluck('page')->map(fn ($page) => (int) $page)->all()) {
            return response()->json(['eroare' => 'Trimiteți textul corectat pentru toate paginile, în ordinea documentului.'], 422);
        }
        $previous = collect($record->corrected_ocr ?? [])->keyBy('page');
        $prepared = [];
        try {
            foreach ($inputPages as $index => $input) {
                $sourcePage = $pages[$index];
                $sourceWords = json_decode($sourcePage->words, true, flags: JSON_THROW_ON_ERROR);
                $old = $previous->get((int) $input['page']) ?? ['text' => $sourcePage->text];
                if (array_key_exists('operations', $input)) {
                    $base = $old['base_text'] ?? $old['text'];
                    $operations = array_merge($old['operations'] ?? [], $input['operations']);
                    if (count($operations) > 10000) throw new \InvalidArgumentException();
                    $association = (new \App\Services\CorrectedOcrAssociation)->map($sourcePage->text, $sourceWords, $base, $operations);
                    if ($association['text'] !== $input['text']) throw new \InvalidArgumentException();
                } else {
                    $base = $input['text'];
                    $operations = [];
                }
                $prepared[] = ['page' => (int) $input['page'], 'text' => $input['text'], 'base_text' => $base, 'operations' => $operations];
            }
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['eroare' => 'Operațiile de corectare nu corespund textului. Reîncărcați editorul.'], 422);
        }
        [$record, $pages, $stale] = DB::transaction(function () use ($draft, $request, $inputPages, $prepared, $audit): array {
            $record = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if ($record === null || $record->status !== 'review_ready' || !$record->ocr_extraction_id) return [null, collect(), true];
            if ((int) $request->input('ocr_revision') !== (int) $record->ocr_revision) return [$record, collect(), true];
            $pages = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)->orderBy('page')->get();
            if ($pages->count() !== count($inputPages) || array_column($inputPages, 'page') !== $pages->pluck('page')->map(fn ($page) => (int) $page)->all()) return [$record, collect(), true];
            $record->corrected_ocr = $prepared;
            $record->ocr_revision = (int) $record->ocr_revision + 1;
            $record->detection_status = 'pending';
            $record->detection_revision = 0;
            $record->metadata_revision = (int) $record->metadata_revision + 1;
            $record->metadata_confirmed_at = null;
            $record->metadata_confirmed_revision = null;
            $record->metadata_confirmed_ocr_revision = null;
            $record->review_snapshot = null;
            $record->pii_candidates = [];
            $record->redaction_marks = null;
            $record->redacted_pdf_storage_key = null;
            $record->redaction_ocr_revision = null;
            $record->redaction_detection_revision = null;
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
            $locked->redacted_pdf_storage_key = null;
            $locked->review_snapshot = null;
            $locked->save();
            $audit->record($request, $locked, 'pii_review_updated');
            return [$candidates, true];
        });
        if (!$changed) return response()->json(['eroare' => 'Rezultatele de detectare s-au schimbat. Reîncărcați editorul înainte de revizuire.'], 409);
        return response()->json(['candidates' => $candidates]);
    }

    public function saveRedactionMarks(Request $request, string $draft, DraftAccessLogger $audit): JsonResponse
    {
        $record = $this->editorDraft($draft);
        if ($record instanceof JsonResponse) return $record;
        $validator = Validator::make($request->all(), [
            'ocr_revision' => 'required|integer|min:1', 'detection_revision' => 'required|integer|min:1',
            'marks' => 'present|array|max:500', 'marks.*.page' => 'required|integer|min:1',
            'marks.*.box.left' => 'required|integer|min:0', 'marks.*.box.top' => 'required|integer|min:0',
            'marks.*.box.width' => 'required|integer|min:1', 'marks.*.box.height' => 'required|integer|min:1',
        ]);
        if ($validator->fails()) return response()->json(['eroare' => 'Marcajele de anonimizare nu sunt valide.'], 422);
        $values = $validator->validated();
        [$saved, $stale] = DB::transaction(function () use ($draft, $values, $request, $audit): array {
            $locked = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if ($locked === null || $locked->detection_status !== 'ready'
                || $values['ocr_revision'] !== (int) $locked->ocr_revision
                || $values['detection_revision'] !== (int) $locked->detection_revision) return [false, true];
            $pages = DB::table('ocr_pages')->where('extraction', $locked->ocr_extraction_id)->get(['page','width','height'])->keyBy('page');
            foreach ($values['marks'] as $mark) {
                $page = $pages->get($mark['page']); $box = $mark['box'];
                if (!$page || $box['left'] + $box['width'] > $page->width || $box['top'] + $box['height'] > $page->height) return [false, false];
            }
            $locked->redaction_marks = $values['marks'];
            $locked->redaction_ocr_revision = $locked->ocr_revision;
            $locked->redaction_detection_revision = $locked->detection_revision;
            $locked->redacted_pdf_storage_key = null;
            $locked->review_snapshot = null;
            $locked->save();
            $audit->record($request, $locked, 'redaction_marks_saved');
            return [true, false];
        });
        if ($stale) return response()->json(['eroare' => 'Revizuirea s-a schimbat. Reîncărcați editorul.'], 409);
        if (!$saved) return response()->json(['eroare' => 'Un marcaj depășește pagina selectată.'], 422);
        return response()->json(['marks' => $values['marks']]);
    }

    public function generateRedaction(Request $request, string $draft, DocumentStorageService $storage, DraftAccessLogger $audit): JsonResponse
    {
        $record = DocumentDraft::query()->find($draft);
        if (!$record) return response()->json(['eroare' => 'Ciorna solicitată nu a fost găsită.'], 404);
        if ($record->status !== 'review_ready' || $record->detection_status !== 'ready'
            || (int) $record->detection_revision !== (int) $record->ocr_revision
            || (!empty($record->redaction_marks) && (
                (int) $record->ocr_revision !== (int) $record->redaction_ocr_revision
                || (int) $record->detection_revision !== (int) $record->redaction_detection_revision
            ))) {
            return response()->json(['eroare' => 'Revizuirea anonimizării este incompletă sau neactualizată. Reîncărcați editorul.'], 409);
        }
        $boxes = [];
        $manualPages = array_fill_keys(array_map(static fn (array $mark): int => (int) $mark['page'], $record->redaction_marks ?? []), true);
        foreach ($record->pii_candidates ?? [] as $candidate) {
            if (($candidate['review_status'] ?? null) !== 'accepted') continue;
            if (($candidate['location_status'] ?? null) !== 'reliable' || empty($candidate['bounding_boxes'])) {
                if (!isset($manualPages[(int) ($candidate['page'] ?? 0)])) return response()->json(['eroare' => 'O potrivire acceptată nu are un marcaj manual pe pagina sa. Adăugați un marcaj manual.'], 422);
                continue;
            }
            foreach ($candidate['bounding_boxes'] as $box) $boxes[$candidate['page']][] = $box;
        }
        foreach ($record->redaction_marks ?? [] as $mark) $boxes[$mark['page']][] = $mark['box'];
        foreach ($record->pii_candidates ?? [] as $candidate) {
            if (!in_array($candidate['review_status'] ?? null, ['accepted', 'rejected'], true)) {
                return response()->json(['eroare' => 'Revizuiți fiecare rezultat de detectare înainte de generarea PDF-ului.'], 422);
            }
        }

        $sourceKey = match ($record->source_format) {
            'docx' => $record->derived_pdf_storage_key,
            'pdf' => ($record->original_storage_keys[0] ?? null),
            default => null,
        };
        $source = tempnam(sys_get_temp_dir(), 'redaction-source-'); $target = sys_get_temp_dir().'/redaction-'.Str::uuid().'.pdf'; $imageWork = null;
        try {
            if ($record->source_format === 'image_collection') {
                $imageWork = sys_get_temp_dir().'/redaction-images-'.Str::uuid(); mkdir($imageWork, 0700);
                $images = [];
                foreach ($record->original_storage_keys ?? [] as $index => $key) {
                    if (!$storage->exists($key)) throw new \RuntimeException('Sursă indisponibilă.');
                    $stream = $storage->readStream($key); $path = "$imageWork/".sprintf('%04d', $index).'.'.(strtolower(pathinfo($key, PATHINFO_EXTENSION)) === 'png' ? 'png' : 'jpg');
                    $output = fopen($path, 'wb'); stream_copy_to_stream($stream, $output); fclose($stream); fclose($output);
                    $images[] = $path;
                }
                if ($images === []) throw new \RuntimeException('Colecția de imagini este goală.');
                (new Process(['img2pdf', '--imgsize', '300dpi', '--output', $source, ...$images]))->mustRun();
            } else {
                if (!$sourceKey || !$storage->exists($sourceKey)) throw new \RuntimeException('Sursă indisponibilă.');
                $stream = $storage->readStream($sourceKey); if (!$stream) throw new \RuntimeException('Sursă indisponibilă.');
                $output = fopen($source, 'wb'); stream_copy_to_stream($stream, $output); fclose($stream); fclose($output);
            }
            (new RedactedPdf)->create($source, $boxes, $target);
            $key = 'redacted/'.$record->id.'/'.Str::uuid().'.pdf';
            $output = fopen($target, 'rb');
            try { if (!$storage->put($key, $output, ['visibility' => 'private'])) throw new \RuntimeException('Publicarea a eșuat.'); }
            finally { fclose($output); }
            $saved = DB::transaction(function () use ($draft, $record, $key, $request, $audit): bool {
                $current = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
                if (!$current || $current->status !== 'review_ready' || $current->detection_status !== 'ready'
                    || (int) $current->ocr_revision !== (int) $record->ocr_revision
                    || (int) $current->detection_revision !== (int) $record->detection_revision
                    || $current->redaction_marks !== $record->redaction_marks
                    || $current->pii_candidates !== $record->pii_candidates) return false;
                $current->redacted_pdf_storage_key = $key;
                $current->redaction_ocr_revision = $current->ocr_revision;
                $current->redaction_detection_revision = $current->detection_revision;
                $current->review_snapshot = null;
                $current->save();
                $audit->record($request, $current, 'redaction_pdf_generated');
                return true;
            });
            if (!$saved) { $storage->delete($key); return response()->json(['eroare' => 'Revizuirea s-a schimbat în timpul generării. Reîncărcați editorul.'], 409); }
            return response()->json(['status' => 'ready']);
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['eroare' => 'PDF-ul anonimizat nu a putut fi generat.'], 500);
        } finally { @unlink($source); @unlink($target); if ($imageWork) \Illuminate\Support\Facades\File::deleteDirectory($imageWork); }
    }

    public function redactedPdf(string $draft, DocumentStorageService $storage)
    {
        $record = DocumentDraft::query()->find($draft);
        if (!$record || !$record->redacted_pdf_storage_key || !$storage->exists($record->redacted_pdf_storage_key)) {
            return response()->json(['eroare' => 'PDF-ul anonimizat nu este disponibil.'], 404);
        }
        return response()->stream(function () use ($storage, $record): void {
            $stream = $storage->readStream($record->redacted_pdf_storage_key);
            if ($stream) { fpassthru($stream); fclose($stream); }
        }, 200, ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store, max-age=0', 'X-Content-Type-Options' => 'nosniff', 'Content-Disposition' => 'inline; filename="anonimizat.pdf"']);
    }

    public function editorPageImage(Request $request, string $draft, int $page, DocumentStorageService $storage, DraftAccessLogger $audit)
    {
        $record = $this->editorDraft($draft);
        if ($record instanceof JsonResponse) return $record;
        $ocrPage = DB::table('ocr_pages')->where('extraction', $record->ocr_extraction_id)->where('page', $page)->first();
        if (!$ocrPage) return response()->json(['eroare' => 'Pagina solicitată nu a fost găsită.'], 404);

        $work = sys_get_temp_dir().'/editor-page-'.Str::uuid(); mkdir($work, 0700);
        try {
            $source = "$work/source.pdf";
            $sourceKey = match ($record->source_format) {
                'docx' => $record->derived_pdf_storage_key,
                'pdf' => ($record->original_storage_keys[0] ?? null),
                default => null,
            };
            if ($record->source_format === 'image_collection') {
                $images = [];
                foreach ($record->original_storage_keys ?? [] as $index => $key) {
                    if (!$storage->exists($key)) throw new \RuntimeException('Sursă indisponibilă.');
                    $stream = $storage->readStream($key);
                    if (!$stream) throw new \RuntimeException('Sursă indisponibilă.');
                    $path = "$work/".sprintf('%04d', $index).'.'.(strtolower(pathinfo($key, PATHINFO_EXTENSION)) === 'png' ? 'png' : 'jpg');
                    $output = fopen($path, 'wb');
                    if (!$output) { fclose($stream); throw new \RuntimeException('Sursa nu poate fi pregătită.'); }
                    try { if (stream_copy_to_stream($stream, $output) === false) throw new \RuntimeException('Sursa nu poate fi pregătită.'); }
                    finally { fclose($stream); fclose($output); }
                    $images[] = $path;
                }
                if ($images === []) throw new \RuntimeException('Colecția de imagini este goală.');
                (new Process(['img2pdf', '--imgsize', '300dpi', '--output', $source, ...$images]))->mustRun();
            } else {
                if (!$sourceKey || !$storage->exists($sourceKey)) throw new \RuntimeException('Sursă indisponibilă.');
                $stream = $storage->readStream($sourceKey); if (!$stream) throw new \RuntimeException('Sursă indisponibilă.');
                $output = fopen($source, 'wb');
                if (!$output) { fclose($stream); throw new \RuntimeException('Sursa nu poate fi pregătită.'); }
                try { if (stream_copy_to_stream($stream, $output) === false) throw new \RuntimeException('Sursa nu poate fi pregătită.'); }
                finally { fclose($stream); fclose($output); }
            }
            $rendered = (new \App\Services\DocumentPageRenderer)->render($source, "$work/rendered");
            $image = collect($rendered)->firstWhere('page', $page);
            if (!$image || $image['width'] !== (int) $ocrPage->width || $image['height'] !== (int) $ocrPage->height) throw new \RuntimeException('Geometria paginii nu se potrivește cu OCR.');
            $audit->record($request, $record, 'editor_page_image_viewed');
            return response()->stream(function () use ($image, $work): void {
                try { readfile($image['path']); }
                finally { \Illuminate\Support\Facades\File::deleteDirectory($work); }
            }, 200, ['Content-Type' => 'image/png', 'Cache-Control' => 'private, no-store, max-age=0', 'X-Content-Type-Options' => 'nosniff']);
        } catch (\Throwable $exception) {
            \Illuminate\Support\Facades\File::deleteDirectory($work);
            report($exception);
            return response()->json(['eroare' => 'Imaginea paginii nu a putut fi pregătită pentru revizuire.'], 500);
        }
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
            'manual_marks' => $record->redaction_marks ?? [],
        ];
    }

    public function metadata(Request $request, string $draft, MetadataSuggestionExtractor $extractor, DraftAccessLogger $audit, \App\Services\RetentionCalculator $retention): JsonResponse
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
            'metadata_revision' => (int) $record->metadata_revision,
            'ocr_revision' => (int) $record->ocr_revision,
            'classification' => $this->classificationData($record->nomenclatureEntry),
            'selected_dossier' => isset($record->metadata['physical_dossier_id'])
                ? PhysicalDossier::query()->find($record->metadata['physical_dossier_id'])
                : null,
            'retention' => $record->nomenclatureEntry
                ? $retention->calculate($record->nomenclatureEntry, $record->metadata ?? [])
                : null,
            'classification_options' => NomenclatureEntry::query()
                ->orderBy('document_type')->orderBy('subtype')->orderBy('storage_context')->get()
                ->map(fn (NomenclatureEntry $entry) => $this->classificationData($entry))->values(),
        ]);
    }

    public function updateMetadata(Request $request, string $draft, DraftAccessLogger $audit, \App\Services\RetentionCalculator $retention): JsonResponse
    {
        $record = $this->metadataDraft($draft);
        if ($record instanceof JsonResponse) {
            return $record;
        }

        $types = NomenclatureEntry::query()->distinct()->pluck('document_type')->all();
        $validator = Validator::make($request->all(), [
            'metadata' => 'required|array:act_date,act_number,physical_dossier_id,physical_dossier_number,inventory_number,amount,contract_expiry,dossier_resolution_date,deposit_date,deposit_release_date,tags',
            'metadata.act_date' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.act_number' => 'sometimes|nullable|string|max:255',
            'metadata.physical_dossier_id' => 'sometimes|nullable|integer|exists:physical_dossiers,id',
            'metadata.physical_dossier_number' => 'prohibited',
            'metadata.inventory_number' => 'sometimes|nullable|string|max:255',
            'metadata.amount' => 'sometimes|nullable|string|max:255',
            'metadata.contract_expiry' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.dossier_resolution_date' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.deposit_date' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.deposit_release_date' => 'sometimes|nullable|date_format:Y-m-d',
            'metadata.tags' => 'sometimes|array',
            'metadata.tags.*' => ['string', 'max:255', Rule::in($types)],
            'nomenclature_entry_id' => 'sometimes|nullable|integer|exists:nomenclature_entries,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['eroare' => 'Metadatele sau clasificarea selectată nu sunt valide.'], 422);
        }

        $values = $validator->validated();
        $metadata = array_replace($record->metadata ?? [], $values['metadata']);
        $previousEntryId = $record->nomenclature_entry_id;
        if (array_key_exists('nomenclature_entry_id', $values)) {
            $record->nomenclature_entry_id = $values['nomenclature_entry_id'];
        }
        if (array_key_exists('physical_dossier_id', $values['metadata'])) {
            $dossier = $values['metadata']['physical_dossier_id']
                ? PhysicalDossier::query()->find($values['metadata']['physical_dossier_id'])
                : null;
            if ($dossier) {
                $metadata['physical_dossier_number'] = $dossier->physical_dossier_number;
                $metadata['inventory_number'] = $dossier->inventory_number;
            } else {
                unset($metadata['physical_dossier_number']);
            }
        }
        $selectedDossier = isset($metadata['physical_dossier_id'])
            ? PhysicalDossier::query()->find($metadata['physical_dossier_id'])
            : null;
        $entry = $record->nomenclatureEntry;
        if ($selectedDossier && $entry && ($selectedDossier->archival_indicator !== $entry->archival_indicator
            || $selectedDossier->retention_time !== $entry->retention_term)) {
            if (array_key_exists('physical_dossier_id', $values['metadata']) && $previousEntryId === $record->nomenclature_entry_id) {
                return response()->json(['eroare' => 'Dosarul fizic nu corespunde indicativului și termenului de păstrare ale clasificării.', 'cod' => 'incompatible_dossier'], 422);
            }
            unset($metadata['physical_dossier_id'], $metadata['physical_dossier_number'], $metadata['inventory_number']);
        }
        $record->metadata = $metadata;
        $record->metadata_revision = (int) $record->metadata_revision + 1;
        $record->metadata_confirmed_at = null;
        $record->metadata_confirmed_revision = null;
        $record->metadata_confirmed_ocr_revision = null;
        $record->review_snapshot = null;
        $record->save();
        $audit->record($request, $record, 'metadata_updated');

        return response()->json([
            'metadata' => $record->metadata,
            'metadata_confirmed' => false,
            'metadata_revision' => (int) $record->metadata_revision,
            'ocr_revision' => (int) $record->ocr_revision,
            'classification' => $this->classificationData($record->nomenclatureEntry),
            'retention' => $record->nomenclatureEntry
                ? $retention->calculate($record->nomenclatureEntry, $record->metadata ?? [])
                : null,
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
        if (! isset($metadata['physical_dossier_id']) || ! PhysicalDossier::query()->whereKey($metadata['physical_dossier_id'])->exists()) {
            return response()->json(['eroare' => 'Selectați dosarul fizic înainte de confirmarea metadatelor.'], 422);
        }
        if (! $record->nomenclature_entry_id || ! $record->nomenclatureEntry()->exists()) {
            return response()->json(['eroare' => 'Alegeți tipul, subtipul și contextul de arhivare înainte de confirmare.'], 422);
        }
        $entry = $record->nomenclatureEntry;
        $dossier = PhysicalDossier::query()->find($metadata['physical_dossier_id']);
        if (! $dossier || $dossier->archival_indicator !== $entry->archival_indicator || $dossier->retention_time !== $entry->retention_term) {
            return response()->json(['eroare' => 'Selectați un dosar fizic corespunzător indicativului și termenului de păstrare.', 'cod' => 'incompatible_dossier'], 422);
        }

        $validator = Validator::make($request->all(), [
            'metadata_revision' => 'required|integer|min:1',
            'ocr_revision' => 'required|integer|min:1',
        ]);
        if ($validator->fails()) return response()->json(['eroare' => 'Trimiteți versiunile curente ale metadatelor și OCR.'], 422);
        $confirmed = DB::transaction(function () use ($draft, $request, $audit): bool {
            $locked = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
            if (!$locked || (int) $request->input('metadata_revision') !== (int) $locked->metadata_revision
                || (int) $request->input('ocr_revision') !== (int) $locked->ocr_revision) return false;
            $locked->metadata_confirmed_at = now();
            $locked->metadata_confirmed_revision = (int) $locked->metadata_revision;
            $locked->metadata_confirmed_ocr_revision = (int) $locked->ocr_revision;
            $locked->save();
            $audit->record($request, $locked, 'metadata_confirmed');
            return true;
        });
        if (!$confirmed) return response()->json(['eroare' => 'Metadatele sau OCR s-au modificat. Reîncărcați înainte de confirmare.', 'cod' => 'stale_revision'], 409);

        return response()->json(['metadata_confirmed' => true, 'metadata_revision' => (int) $record->fresh()->metadata_revision, 'ocr_revision' => (int) $record->fresh()->ocr_revision]);
    }

    public function confirmFinalReview(
        Request $request,
        string $draft,
        DraftAccessLogger $audit,
        \App\Services\ReviewSnapshotService $snapshots,
        DocumentStorageService $storage,
        \App\Services\RetentionCalculator $retention,
    ): JsonResponse {
        $record = $this->metadataDraft($draft);
        if ($record instanceof JsonResponse) return $record;
        $validator = Validator::make($request->all(), [
            'metadata_revision' => 'required|integer|min:1',
            'ocr_revision' => 'required|integer|min:1',
            'detection_revision' => 'required|integer|min:1',
            'redaction_ocr_revision' => 'required|integer|min:1',
            'redaction_detection_revision' => 'required|integer|min:1',
        ]);
        if ($validator->fails()) return response()->json(['eroare' => 'Trimiteți versiunile curente ale metadatelor, OCR și anonimizării.', 'cod' => 'invalid_review_revision'], 422);

        try {
            $snapshot = DB::transaction(function () use ($draft, $request, $validator, $audit, $snapshots, $storage, $retention): array {
                $locked = DocumentDraft::query()->whereKey($draft)->lockForUpdate()->first();
                $values = $validator->validated();
                if (!$locked || $values['metadata_revision'] !== (int) $locked->metadata_revision
                    || $values['ocr_revision'] !== (int) $locked->ocr_revision
                    || $values['detection_revision'] !== (int) $locked->detection_revision
                    || $values['redaction_ocr_revision'] !== (int) $locked->redaction_ocr_revision
                    || $values['redaction_detection_revision'] !== (int) $locked->redaction_detection_revision) {
                    throw new \App\Services\PublicationProblem(409, 'stale_revision', 'Revizuirea s-a modificat. Reîncărcați Editorul.');
                }
                $snapshot = $snapshots->issue($locked, $storage, $retention, (int) $request->user()->id);
                $audit->record($request, $locked, 'final_review_confirmed');
                return $snapshot;
            });
        } catch (\App\Services\PublicationProblem $problem) {
            return response()->json(['eroare' => $problem->getMessage(), 'cod' => $problem->problemCode] + $problem->details, $problem->httpStatus);
        } catch (\Throwable $exception) {
            report($exception);
            return response()->json(['eroare' => 'Confirmarea finală nu a putut fi salvată.', 'cod' => 'review_confirmation_failed'], 503);
        }
        return response()->json([
            'review_confirmed' => true,
            'review_snapshot' => $snapshot['token'],
            'confirmed_at' => $snapshot['confirmed_at'],
            'metadata_revision' => $snapshot['metadata_revision'],
            'ocr_revision' => $snapshot['ocr_revision'],
            'detection_revision' => $snapshot['detection_revision'],
        ]);
    }

    public function publish(Request $request, string $draft, \App\Services\DocumentPublicationService $publication): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'review_snapshot' => 'required|string|uuid',
            'target_document_id' => 'sometimes|nullable|uuid',
            'target_version_id' => 'sometimes|nullable|uuid',
            'duplicate_action' => 'sometimes|nullable|in:version,separate,cancel',
        ]);
        if ($validator->fails() || !$request->header('Idempotency-Key')) {
            return response()->json(['eroare' => 'Cererea de publicare sau cheia de idempotentă nu sunt valide.', 'cod' => 'invalid_publication_request'], 422);
        }
        $key = (string) $request->header('Idempotency-Key');
        if (strlen($key) > 255 || preg_match('/[[:cntrl:]]/', $key)) {
            return response()->json(['eroare' => 'Cheia de idempotentă nu este validă.', 'cod' => 'invalid_idempotency_key'], 422);
        }
        try {
            $result = $publication->publish(
                $draft,
                (int) $request->user()->id,
                $key,
                $validator->validated()['review_snapshot'],
                $validator->validated()['target_document_id'] ?? null,
                $validator->validated()['target_version_id'] ?? null,
                $validator->validated()['duplicate_action'] ?? null,
            );
            return response()->json($result['body'], $result['status']);
        } catch (\App\Services\PublicationProblem $problem) {
            return response()->json(['eroare' => $problem->getMessage(), 'cod' => $problem->problemCode] + $problem->details, $problem->httpStatus);
        }
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
            'retention_term' => $entry->retention_term,
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
