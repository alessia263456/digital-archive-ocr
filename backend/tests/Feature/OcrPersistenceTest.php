<?php

namespace Tests\Feature;

use App\Services\OcrExtraction;
use App\Services\RedactedPdf;
use App\Services\DocumentPageRenderer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class OcrPersistenceTest extends TestCase
{
    public function test_second_page_failure_rolls_back_and_retry_preserves_page_order(): void
    {
        if (!is_executable('/usr/bin/tesseract')) {
            self::markTestSkipped('Integration runs in the OCR worker image.');
        }
        self::assertSame('archive_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);
        $source = base_path('tests/Fixtures/rendering/text-rotation.pdf');
        $before = DB::table('ocr_pages')->count();
        $work = sys_get_temp_dir().'/ocr-retry-'.bin2hex(random_bytes(8));
        mkdir($work, 0700);
        $path = getenv('PATH');
        try {
            file_put_contents("$work/tesseract", <<<'SH'
#!/bin/sh
/usr/bin/tesseract "$@" || exit 1
case "$1" in *page-2.png) echo malformed > "$2.tsv" ;; esac
SH);
            chmod("$work/tesseract", 0700);
            putenv("PATH=$work:$path");
            try {
                (new OcrExtraction)->extract($source);
                self::fail('Expected a malformed second page to abort extraction.');
            } catch (\RuntimeException $error) {
                self::assertStringContainsString('TSV', $error->getMessage());
            }
            self::assertSame($before, DB::table('ocr_pages')->count());
        } finally {
            putenv("PATH=$path");
            File::deleteDirectory($work);
        }
        $id = (new OcrExtraction)->extract($source);
        try {
            self::assertSame([1,2], DB::table('ocr_pages')->where('extraction',$id)->orderBy('page')->pluck('page')->all());
        } finally {
            DB::table('ocr_pages')->where('extraction',$id)->delete();
        }
    }

    public function test_worker_persists_romanian_words_and_their_boxes_can_be_burned(): void
    {
        if (!is_executable('/usr/bin/tesseract')) {
            self::markTestSkipped('Integration runs in the OCR worker image.');
        }
        self::assertSame('archive_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);
        $source = base_path('tests/Fixtures/rendering/romanian.png');
        $id = (new OcrExtraction)->extract($source);
        $work = sys_get_temp_dir().'/ocr-proof-'.$id;
        mkdir($work, 0700);
        try {
            $page = DB::table('ocr_pages')->where('extraction', $id)->sole();
            self::assertSame(hash_file('sha256', $source), $page->source_sha256);
            self::assertStringContainsString('Știință', $page->text);
            self::assertStringContainsString('Știință', $page->tsv);
            $words = json_decode($page->words, true, flags: JSON_THROW_ON_ERROR);
            self::assertSame(['Știință','și','cultură','în','România'], array_column($words, 'text'));
            $word = $words[0];
            (new RedactedPdf)->create($source, [$page->page => [$word]], "$work/out.pdf");
            $pages = (new DocumentPageRenderer)->render("$work/out.pdf", "$work/pages");
            $image = imagecreatefrompng($pages[0]['path']);
            self::assertSame(0, imagecolorat($image,$word['left']+2,$word['top']+2) & 0xffffff);
        } finally {
            DB::table('ocr_pages')->where('extraction', $id)->delete();
            File::deleteDirectory($work);
        }
    }
}
