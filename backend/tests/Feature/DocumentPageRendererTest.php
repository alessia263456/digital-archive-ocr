<?php

namespace Tests\Feature;

use App\Services\DocumentPageRenderer;
use Illuminate\Filesystem\Filesystem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Symfony\Component\Process\Process;

class DocumentPageRendererTest extends TestCase
{
    private const FIXTURES = __DIR__.'/../Fixtures/rendering/';
    private string $root;
    private string $dest;

    protected function setUp(): void
    {
        $this->root = sys_get_temp_dir().'/renderer-test-'.bin2hex(random_bytes(8));
        mkdir($this->root, 0700);
        $this->dest = $this->root.'/pages';
    }

    protected function tearDown(): void
    {
        (new Filesystem)->deleteDirectory($this->root);
    }

    public function test_pdf_has_expected_dimensions_and_asymmetric_mark(): void
    {
        $renderer = new DocumentPageRenderer;
        $pages = $renderer->render(self::FIXTURES.'mark.pdf', $this->dest);
        self::assertCount(1, $pages);
        $page = $pages[0];
        self::assertSame([1, 300, 600], [$page['page'], $page['width'], $page['height']]);
        $image = imagecreatefrompng($page['path']);
        self::assertSame([300, 600], [imagesx($image), imagesy($image)]);
        self::assertSame(0, imagecolorat($image, 20, 550));
        self::assertSame(0xffffff, imagecolorat($image, 20, 20));
        $again = $renderer->render(self::FIXTURES.'mark.pdf', $this->root.'/again');
        self::assertSame(hash_file('sha256', $page['path']), hash_file('sha256', $again[0]['path']));
    }

    public static function images(): array
    {
        return [['jpg'], ['png']];
    }

    #[DataProvider('images')]
    public function test_native_image_pixels_and_input_bytes_are_preserved(string $ext): void
    {
        $input = $this->root.'/misleading.pdf';
        copy(self::FIXTURES.'romanian.'.$ext, $input);
        $hash = hash_file('sha256', $input);
        $pages = (new DocumentPageRenderer)->render($input, $this->dest);
        self::assertCount(1, $pages);
        $page = $pages[0];
        self::assertSame([1, 1000, 160], [$page['page'], $page['width'], $page['height']]);
        $actual = imagecreatefrompng($page['path']);
        $expected = imagecreatefromstring(file_get_contents($input));
        self::assertSame([1000, 160], [imagesx($actual), imagesy($actual)]);
        for ($y = 0; $y < 160; $y += 9) {
            for ($x = 0; $x < 1000; $x += 13) {
                if (imagecolorat($expected, $x, $y) !== imagecolorat($actual, $x, $y)) {
                    self::fail("Pixel mismatch at $x, $y");
                }
            }
        }
        self::assertSame($hash, hash_file('sha256', $input));
    }

    public function test_all_twelve_pages_return_in_numeric_order(): void
    {
        $pages = (new DocumentPageRenderer)->render(self::FIXTURES.'ordering.pdf', $this->dest);
        self::assertSame(range(1, 12), array_column($pages, 'page'));
        self::assertCount(12, array_unique(array_column($pages, 'path')));
        foreach ($pages as $page) {
            self::assertFileExists($page['path']);
        }
    }

    public static function badInputs(): array
    {
        return [['plain'], ['mark.pdf'], ['romanian.jpg'], ['romanian.png']];
    }

    #[DataProvider('badInputs')]
    public function test_invalid_content_fails_cleanly(string $fixture): void
    {
        $file = $this->root.'/bad.png';
        $bytes = $fixture === 'plain' ? 'invalid' : substr(file_get_contents(self::FIXTURES.$fixture), 0, 100);
        file_put_contents($file, $bytes);
        $this->assertFailureAndRetry(new DocumentPageRenderer, $file);
    }

    public static function limits(): array
    {
        return [
            [['inputBytes' => 100]], [['pages' => 3]], [['pixels' => 200000]],
            [['memoryBytes' => 8000000]], [['outputBytes' => 80]],
        ];
    }

    #[DataProvider('limits')]
    public function test_limits_release_staging_and_allow_retry(array $limits): void
    {
        $this->assertFailureAndRetry(new DocumentPageRenderer(...$limits), self::FIXTURES.'ordering.pdf');
    }

    private function assertFailureAndRetry(DocumentPageRenderer $renderer, string $file): void
    {
        $before = scandir($this->root);
        try {
            $renderer->render($file, $this->dest);
            self::fail('Conversion should have failed');
        } catch (RuntimeException $e) {
            self::assertNotSame('', $e->getMessage());
        }
        self::assertSame($before, scandir($this->root));
        self::assertCount(1, (new DocumentPageRenderer)->render(self::FIXTURES.'mark.pdf', $this->dest));
    }

    private function fakePoppler(string $body): array
    {
        $tool = $this->root.'/pdftoppm';
        file_put_contents($tool, "#!/usr/local/bin/php\n<?php\n".$body);
        chmod($tool, 0700);
        return ['PATH' => $this->root.':'.getenv('PATH')];
    }

    public function test_timeout_stops_child_and_removes_staging(): void
    {
        $renderer = new DocumentPageRenderer(seconds: 0.5);
        $env = $this->fakePoppler('file_put_contents(__DIR__."/pid", getmypid()); sleep(15);');
        $oldPath = getenv('PATH');
        putenv('PATH='.$env['PATH']);
        $start = microtime(true);
        try {
            $renderer->render(self::FIXTURES.'mark.pdf', $this->dest);
            self::fail('Conversion should time out');
        } catch (RuntimeException) {
            self::assertLessThan(4, microtime(true) - $start);
        } finally {
            putenv('PATH='.$oldPath);
        }
        self::assertFileExists($this->root.'/pid');
        self::assertDirectoryDoesNotExist('/proc/'.file_get_contents($this->root.'/pid'));
        self::assertSame(['.', '..', 'pdftoppm', 'pid'], scandir($this->root));
        self::assertCount(1, (new DocumentPageRenderer)->render(self::FIXTURES.'mark.pdf', $this->dest));
    }

    public function test_missing_page_fails_before_publication(): void
    {
        $renderer = new DocumentPageRenderer;
        $env = $this->fakePoppler('if (in_array("10", $argv, true)) exit(0); passthru("/usr/bin/pdftoppm ".implode(" ", array_map("escapeshellarg", array_slice($argv, 1))), $status); exit($status);');
        $oldPath = getenv('PATH');
        putenv('PATH='.$env['PATH']);
        try {
            $this->assertFailureAndRetry($renderer, self::FIXTURES.'ordering.pdf');
        } finally {
            putenv('PATH='.$oldPath);
        }
    }

    public function test_concurrent_publishers_cannot_expose_or_replace_partial_results(): void
    {
        $renderer = new DocumentPageRenderer;
        $env = $this->fakePoppler(<<<'CHILD'
            passthru('/usr/bin/pdftoppm '.implode(' ', array_map('escapeshellarg', array_slice($argv, 1))), $status);
            if ($status !== 0) exit($status);
            touch(__DIR__.'/ready');
            while (!file_exists(__DIR__.'/release')) usleep(10000);
            CHILD);
        $process = new Process([PHP_BINARY, '-r',
            'require "vendor/autoload.php"; (new App\\Services\\DocumentPageRenderer)->render($argv[1], $argv[2]);',
            self::FIXTURES.'mark.pdf', $this->dest], dirname(__DIR__, 2), $env);
        $process->start();
        try {
            $deadline = microtime(true) + 5;
            while (!file_exists($this->root.'/ready') && $process->isRunning() && microtime(true) < $deadline) {
                usleep(10000);
            }
            self::assertFileExists($this->root.'/ready');
            self::assertDirectoryDoesNotExist($this->dest);
            $winner = $renderer->render(self::FIXTURES.'romanian.png', $this->dest);
            $hash = hash_file('sha256', $winner[0]['path']);
            touch($this->root.'/release');
            self::assertNotSame(0, $process->wait());
            self::assertSame($hash, hash_file('sha256', $winner[0]['path']));
            self::assertSame(['.', '..', 'pages', 'pdftoppm', 'ready', 'release'], scandir($this->root));
        } finally {
            touch($this->root.'/release');
            $process->stop();
        }
    }
}
