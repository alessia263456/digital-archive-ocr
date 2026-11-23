<?php

namespace App\Services;

use App\Jobs\ProcessDocumentDraft;
use App\Models\DocumentDraft;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

final class DocumentDraftIntakeService
{
    private const MAX_BYTES = 32 * 1024 * 1024;
    private const MAX_IMAGE_PAGES = 64;

    public function __construct(
        private readonly DocumentStorageService $storage,
        private readonly DocxConversionService $docx,
    ) {}

    /** @return array<string, mixed> */
    public function acceptDocument(mixed $file): array
    {
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            return ['status' => 'invalid', 'error' => 'Documentul nu a putut fi încărcat.'];
        }

        $extension = strtolower($file->getClientOriginalExtension());
        if ($file->getSize() > self::MAX_BYTES) {
            return ['status' => 'invalid', 'error' => 'Documentul depășește dimensiunea acceptată.'];
        }

        if ($extension === 'pdf' && file_get_contents($file->getRealPath(), false, null, 0, 5) === '%PDF-') {
            return $this->persist('pdf', [$file]);
        }

        if ($extension === 'docx') {
            return $this->persist('docx', [$file]);
        }

        return ['status' => 'invalid', 'error' => 'Sunt acceptate doar documentele PDF și DOCX.'];
    }

    /** @param array<mixed> $files
     *  @return array<string, mixed>
     */
    public function acceptImages(array $files): array
    {
        if ($files === []) {
            return ['status' => 'invalid', 'error' => 'Adăugați cel puțin o imagine.'];
        }
        if (count($files) > self::MAX_IMAGE_PAGES) {
            return ['status' => 'invalid', 'error' => 'Colecția depășește numărul maxim de pagini.'];
        }

        foreach ($files as $file) {
            if (!$file instanceof UploadedFile || !$file->isValid() || $file->getSize() > self::MAX_BYTES) {
                return ['status' => 'invalid', 'error' => 'O imagine nu a putut fi încărcată sau depășește dimensiunea acceptată.'];
            }
            if (!$this->isSupportedImage($file)) {
                return ['status' => 'invalid', 'error' => 'Colecția acceptă numai imagini JPG și PNG.'];
            }
        }

        return $this->persist('image_collection', $files);
    }

    /** @param list<UploadedFile> $files
     *  @return array<string, mixed>
     */
    private function persist(string $format, array $files): array
    {
        $id = (string) Str::uuid();
        $keys = [];
        $derivedKey = null;
        $stagePath = null;

        try {
            DB::transaction(function () use ($id, $format, $files, &$keys, &$derivedKey, &$stagePath): void {
                foreach ($files as $index => $file) {
                    $extension = strtolower($file->getClientOriginalExtension());
                    $key = "drafts/{$id}/originals/".str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT).".{$extension}";
                    $keys[] = $key;
                    $stream = fopen($file->getRealPath(), 'rb');
                    try {
                        if (!is_resource($stream) || !$this->storage->put($key, $stream)) {
                            throw new RuntimeException();
                        }
                    } finally {
                        if (is_resource($stream)) {
                            fclose($stream);
                        }
                    }
                }

                if ($format === 'docx') {
                    $stagePath = 'draft-intake/'.$id;
                    $stage = Storage::disk('local');
                    $sourceStream = $this->storage->readStream($keys[0]);
                    try {
                        if (!is_resource($sourceStream) || !$stage->put($stagePath.'/original.docx', $sourceStream)) {
                            throw new RuntimeException();
                        }
                    } finally {
                        if (is_resource($sourceStream)) {
                            fclose($sourceStream);
                        }
                    }
                    $localPath = $stage->path($stagePath.'/original.docx');
                    if (!$localPath || !is_file($localPath)) {
                        throw new RuntimeException();
                    }
                    $conversionDisk = Storage::disk('local');
                    $this->docx->convert($conversionDisk, $stagePath.'/original.docx', $stagePath.'/derived.pdf');
                    $derivedKey = "drafts/{$id}/derived/document.pdf";
                    $pdfStream = $stage->readStream($stagePath.'/derived.pdf');
                    try {
                        if (!is_resource($pdfStream) || !$this->storage->put($derivedKey, $pdfStream)) {
                            throw new RuntimeException();
                        }
                    } finally {
                        if (is_resource($pdfStream)) {
                            fclose($pdfStream);
                        }
                    }
                }

                DocumentDraft::query()->create([
                    'id' => $id,
                    'source_format' => $format,
                    'original_storage_keys' => $keys,
                    'derived_pdf_storage_key' => $derivedKey,
                    'status' => 'queued',
                ]);
            });

            ProcessDocumentDraft::dispatch($id);

            return ['id' => $id, 'status' => 'queued'];
        } catch (Throwable) {
            DocumentDraft::query()->whereKey($id)->delete();
            foreach ($keys as $key) {
                try {
                    $this->storage->delete($key);
                } catch (Throwable) {
                    // Keep the per-item response generic and avoid exposing storage details.
                }
            }
            if ($derivedKey !== null) {
                try {
                    $this->storage->delete($derivedKey);
                } catch (Throwable) {
                    // Keep the per-item response generic and avoid exposing storage details.
                }
            }

            return ['status' => 'invalid', 'error' => 'Documentul nu a putut fi păstrat ca ciornă privată.'];
        } finally {
            if ($stagePath !== null) {
                try {
                    Storage::disk('local')->deleteDirectory($stagePath);
                } catch (Throwable) {
                    // Local staging cleanup must not replace the per-item intake result.
                }
            }
        }
    }

    private function isSupportedImage(UploadedFile $file): bool
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $signature = file_get_contents($file->getRealPath(), false, null, 0, 8);

        return ($extension === 'png' && $signature === "\x89PNG\r\n\x1a\n")
            || (in_array($extension, ['jpg', 'jpeg'], true) && str_starts_with($signature, "\xff\xd8\xff"));
    }
}
