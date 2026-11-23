<?php

namespace App\Http\Controllers;

use App\Models\DocumentDraft;
use App\Services\DocumentDraftIntakeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
