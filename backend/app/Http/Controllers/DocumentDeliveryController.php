<?php

namespace App\Http\Controllers;

use App\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DocumentDeliveryController
{
    public function __invoke(
        Request $request,
        string $token,
        DocumentStorageService $storage
    ): StreamedResponse|JsonResponse {
        if (!$request->hasValidSignature()) {
            return response()->json([
                'eroare' => 'Semnătură nevalidă sau expirată.',
            ], 403);
        }

        $payload = $storage->resolveToken($token);
        if ($payload === null || empty($payload['path'])) {
            return response()->json([
                'eroare' => 'Fișierul solicitat nu a fost găsit.',
            ], 404);
        }

        $path = $payload['path'];
        if (!$storage->exists($path)) {
            return response()->json([
                'eroare' => 'Fișierul solicitat nu a fost găsit.',
            ], 404);
        }

        $stream = $storage->readStream($path);
        if (!is_resource($stream)) {
            return response()->json([
                'eroare' => 'Fișierul solicitat nu a fost găsit.',
            ], 404);
        }

        $mime = $storage->mimeType($path) ?? 'application/octet-stream';
        $isAttachment = $request->query('disposition') === 'attachment';
        $filename = $request->query('filename') ?: ($payload['filename'] ?? basename($path));
        $sanitizedFilename = str_replace(['"', "\r", "\n"], '', $filename);
        $disposition = ($isAttachment ? 'attachment' : 'inline').'; filename="'.$sanitizedFilename.'"';

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => $disposition,
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
