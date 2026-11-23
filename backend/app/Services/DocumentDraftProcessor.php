<?php

namespace App\Services;

use App\Models\DocumentDraft;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

class DocumentDraftProcessor
{
    public function __construct(
        private readonly DocumentStorageService $storage,
        private readonly OcrExtraction $ocr,
    ) {}

    public function process(DocumentDraft $draft): string
    {
        $keys = $draft->source_format === 'docx'
            ? [$draft->derived_pdf_storage_key]
            : $draft->original_storage_keys;
        if ($keys === [] || in_array(null, $keys, true)) {
            throw new RuntimeException('Ciorna nu are surse pentru procesarea OCR.');
        }

        $work = sys_get_temp_dir().'/draft-ocr-'.Str::uuid();
        if (!mkdir($work, 0700)) {
            throw new RuntimeException('Spațiul temporar pentru OCR nu poate fi creat.');
        }

        try {
            $sources = [];
            foreach ($keys as $index => $key) {
                $stream = $this->storage->readStream($key);
                if (!is_resource($stream)) {
                    throw new RuntimeException('Sursa privată nu poate fi citită.');
                }
                $path = $work.'/source-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
                $target = fopen($path, 'xb');
                try {
                    if (!is_resource($target)) {
                        throw new RuntimeException('Sursa privată nu poate fi pregătită pentru OCR.');
                    }
                    $bytes = stream_copy_to_stream($stream, $target, 32 * 1024 * 1024 + 1);
                    if ($bytes === false || $bytes === 0 || $bytes > 32 * 1024 * 1024 || !fflush($target)) {
                        throw new RuntimeException('Sursa privată depășește limita acceptată.');
                    }
                } finally {
                    fclose($stream);
                    if (is_resource($target)) {
                        fclose($target);
                    }
                }
                $sources[] = $path;
            }

            return $this->ocr->extractSources($sources);
        } finally {
            File::deleteDirectory($work);
        }
    }
}
