<?php

namespace App\Http\Controllers;

use App\Models\DocumentDraft;
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
        $documents = $request->file('documents', []);
        if (!is_array($documents)) {
            $documents = [$documents];
        }
        foreach ($documents as $index => $file) {
            $items[] = ['group' => 'documents', 'index' => $index] + $intake->acceptDocument($file);
        }

        $images = $request->file('images', []);
        if ($images !== []) {
            if (!is_array($images)) {
                $images = [$images];
            }
            $items[] = ['group' => 'images'] + $intake->acceptImages($images);
        }

        if ($items === []) {
            return response()->json([
                'eroare' => 'Selectați cel puțin un document sau o colecție de imagini.',
            ], 422);
        }

        return response()->json(['items' => $items]);
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
