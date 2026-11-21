<?php

namespace Tests\Feature;

use App\Services\DocumentPageRenderer;
use App\Services\RedactedPdf;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Tests\TestCase;

final class RedactedPdfTest extends TestCase
{
    public function test_invalid_box_leaves_no_derivative(): void
    {
        $target = sys_get_temp_dir().'/invalid-'.bin2hex(random_bytes(8)).'.pdf';
        try {
            (new RedactedPdf)->create(base_path('tests/Fixtures/rendering/mark.pdf'), [
                1 => [['left'=>299, 'top'=>0, 'width'=>2, 'height'=>1]],
            ], $target);
            self::fail('Expected an out-of-bounds box to fail.');
        } catch (\RuntimeException $error) {
            self::assertStringContainsString('Coordonate', $error->getMessage());
        }
        self::assertFileDoesNotExist($target);
    }

    public function test_rotated_coverage_and_text_removal(): void
    {
        $source = base_path('tests/Fixtures/rendering/text-rotation.pdf');
        $digest = hash_file('sha256', $source);
        $work = sys_get_temp_dir().'/pdf-test-'.bin2hex(random_bytes(8));
        mkdir($work, 0700);
        try {
            $extract = fn ($path) => (new Process(['pdftotext', $path, '-']))->mustRun()->getOutput();
            self::assertStringContainsString('MARKER', $extract($source));
            (new RedactedPdf)->create($source, [2 => [['left'=>115,'top'=>40,'width'=>68,'height'=>295]]], "$work/out.pdf");
            self::assertSame('', trim($extract("$work/out.pdf"), " \r\n\t\f"));
            $pages = (new DocumentPageRenderer)->render("$work/out.pdf", "$work/pages");
            self::assertCount(2, $pages);
            self::assertSame([300,600], [$pages[1]['width'],$pages[1]['height']]);
            $image = imagecreatefrompng($pages[1]['path']);
            foreach ([[116,41],[181,333]] as [$x,$y]) {
                self::assertSame(0, imagecolorat($image,$x,$y) & 0xffffff);
            }
            self::assertSame(0xffffff, imagecolorat($image,110,40) & 0xffffff);
            (new Process(['pdfimages','-f','2','-l','2','-png',"$work/out.pdf","$work/embedded"]))->mustRun();
            $pixels = imagecreatefrompng("$work/embedded-000.png");
            foreach ([[115,40],[182,40],[115,334],[182,334]] as [$x,$y]) {
                self::assertSame(0, imagecolorat($pixels,$x,$y) & 0xffffff);
            }
            foreach ([[114,40],[183,40],[115,39],[115,335]] as [$x,$y]) {
                self::assertSame(0xffffff, imagecolorat($pixels,$x,$y) & 0xffffff);
            }
            self::assertSame($digest, hash_file('sha256', $source));
        } finally {
            File::deleteDirectory($work);
        }
    }
}
