<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;

final class OcrExtraction
{
    public function extract(string $source): string
    {
        return $this->extractSources([$source]);
    }

    /** @param non-empty-list<string> $sources */
    public function extractSources(array $sources): string
    {
        if ($sources === []) {
            throw new RuntimeException('Nu există surse pentru extragerea OCR.');
        }

        $id = (string) Str::uuid();
        $work = sys_get_temp_dir().'/ocr-'.$id;
        if (!mkdir($work, 0700)) {
            throw new RuntimeException('Spațiul temporar pentru OCR nu poate fi creat.');
        }
        try {
            $prepared = [];
            foreach ($sources as $index => $source) {
                $path = $work.'/source-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
                if (!is_file($source) || filesize($source) > 32 * 1024 * 1024 || !copy($source, $path)) {
                    throw new RuntimeException('Sursă OCR nevalidă.');
                }
                $prepared[] = ['path' => $path, 'digest' => hash_file('sha256', $path)];
            }

            DB::transaction(function () use ($prepared, $id, $work) {
                $pageNumber = 1;
                foreach ($prepared as $index => $source) {
                    $directory = $work.'/pages-'.($index + 1);
                    $pages = (new DocumentPageRenderer)->render($source['path'], $directory);
                    foreach ($pages as $page) {
                        if ($pageNumber > 64) {
                            throw new RuntimeException('Numărul de pagini depășește limita.');
                        }
                        $process = new Process(['prlimit', '--core=0', '--fsize=16777216', '--as=536870912', '--',
                            'tesseract', $page['path'], "$work/result", '-l', 'ron', 'txt', 'tsv'], env: ['PATH' => getenv('PATH')]);
                        $process->disableOutput();
                        if ($process->run() !== 0) {
                            throw new RuntimeException('Extragerea OCR a eșuat.');
                        }
                        $tsv = file_get_contents("$work/result.tsv");
                        $words = OcrTsv::words($tsv, $page['width'], $page['height']);
                        DB::table('ocr_pages')->insert([
                            'extraction' => $id, 'source_sha256' => $source['digest'], 'page' => $pageNumber++,
                            'width' => $page['width'], 'height' => $page['height'],
                            'text' => file_get_contents("$work/result.txt"), 'tsv' => $tsv,
                            'words' => json_encode($words, JSON_THROW_ON_ERROR),
                        ]);
                        unlink("$work/result.tsv");
                        unlink("$work/result.txt");
                    }
                }
            });
            return $id;
        } finally {
            File::deleteDirectory($work);
        }
    }
}
