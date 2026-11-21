<?php

namespace Tests\Feature;

use App\Services\DocumentPageRenderer;
use App\Services\DocxConversionService;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

final class DocxConversionServiceTest extends TestCase
{
    private $disk;
    private string $original;

    protected function setUp(): void
    {
        parent::setUp();
        $this->disk = Storage::fake('conversion');
        $this->original = file_get_contents(__DIR__.'/../Fixtures/conversion/two-pages.docx');
        $this->disk->put('original.docx', $this->original);
    }

    public function test_preserves_original_and_converts_both_pages_in_order(): void
    {
        (new DocxConversionService)->convert($this->disk, 'original.docx', 'derived/document.pdf');
        self::assertSame(hash('sha256', $this->original), hash('sha256', $this->disk->get('original.docx')));
        $pdf = $this->disk->path('derived/document.pdf');
        foreach ([1 => 'Prima pagină', 2 => 'A doua pagină'] as $page => $marker) {
            $text = new Process(['pdftotext', '-f', $page, '-l', $page, $pdf, '-']);
            self::assertSame($marker, trim($text->mustRun()->getOutput()));
        }
        $pages = (new DocumentPageRenderer)->render($pdf, $this->disk->path('pages'));
        self::assertSame([1, 2], array_column($pages, 'page'));
    }

    public static function failures(): array
    {
        return [['alias'], ['occupied'], ['invalid'], ['truncated'], ['timeout'], ['missing output']];
    }

    #[DataProvider('failures')]
    public function test_failure_preserves_objects_and_allows_retry(string $case): void
    {
        $service = new DocxConversionService(seconds: $case === 'timeout' ? 0.001 : 60,
            executable: $case === 'missing output' ? '/bin/true' : 'libreoffice');
        $this->disk->put('existing.pdf', 'existing');
        $input = match ($case) {
            'invalid' => 'plain text',
            'truncated' => substr($this->original, 0, 80),
            default => $this->original,
        };
        $this->disk->put('original.docx', $input);
        try {
            $service->convert($this->disk, 'original.docx', match ($case) {
                'alias' => './original.docx', 'occupied' => 'existing.pdf', default => 'result.pdf',
            });
            self::fail('Expected conversion failure');
        } catch (RuntimeException $error) {
            self::assertStringContainsString('convers', $error->getMessage());
        }
        self::assertSame($input, $this->disk->get('original.docx'));
        self::assertSame('existing', $this->disk->get('existing.pdf'));
        self::assertFileDoesNotExist($this->disk->path('result.pdf'));
        self::assertSame([], glob($this->disk->path('.docx-*')));
        $this->disk->put('original.docx', $this->original);
        (new DocxConversionService)->convert($this->disk, 'original.docx', 'result.pdf');
        self::assertFileExists($this->disk->path('result.pdf'));
    }

    public function test_concurrent_publication_has_one_winner(): void
    {
        $script = <<<'CODE'
        require 'vendor/autoload.php';
        $app = require 'bootstrap/app.php';
        $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
        $disk = Illuminate\Support\Facades\Storage::build(['driver'=>'local','root'=>$argv[1]]);
        try {
            (new App\Services\DocxConversionService)->convert($disk,'original.docx','result.pdf');
        } catch (RuntimeException) { exit(2); }
        CODE;
        $workers = [];
        foreach ([1, 2] as $i) {
            $workers[] = $worker = new Process([PHP_BINARY, '-r', $script, $this->disk->path('')], base_path());
            $worker->start();
        }
        $codes = array_map(fn ($worker) => $worker->wait(), $workers);
        sort($codes);
        self::assertSame([0, 2], $codes);
        self::assertStringStartsWith('%PDF-', $this->disk->get('result.pdf'));
        self::assertSame($this->original, $this->disk->get('original.docx'));
    }
}
