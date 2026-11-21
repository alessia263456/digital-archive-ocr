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
        $id = (string) Str::uuid();
        $work = sys_get_temp_dir().'/ocr-'.$id;
        mkdir($work, 0700);
        try {
            if (!is_file($source) || filesize($source) > 32 * 1024 * 1024 || !copy($source, "$work/source")) {
                throw new RuntimeException('Sursă OCR nevalidă.');
            }
            $digest = hash_file('sha256', "$work/source");
            $pages = (new DocumentPageRenderer)->render("$work/source", "$work/pages");
            DB::transaction(function () use ($pages, $id, $digest, $work) {
                foreach ($pages as $page) {
                    $process = new Process(['prlimit', '--core=0', '--fsize=16777216', '--as=536870912', '--',
                        'tesseract', $page['path'], "$work/result", '-l', 'ron', 'txt', 'tsv'], env: ['PATH' => getenv('PATH')]);
                    $process->disableOutput();
                    if ($process->run() !== 0) {
                        throw new RuntimeException('Extragerea OCR a eșuat.');
                    }
                    $tsv = file_get_contents("$work/result.tsv");
                    $words = OcrTsv::words($tsv, $page['width'], $page['height']);
                    DB::table('ocr_pages')->insert([
                        'extraction' => $id, 'source_sha256' => $digest, 'page' => $page['page'],
                        'width' => $page['width'], 'height' => $page['height'],
                        'text' => file_get_contents("$work/result.txt"), 'tsv' => $tsv,
                        'words' => json_encode($words, JSON_THROW_ON_ERROR),
                    ]);
                    unlink("$work/result.tsv");
                    unlink("$work/result.txt");
                }
            });
            return $id;
        } finally {
            File::deleteDirectory($work);
        }
    }
}
