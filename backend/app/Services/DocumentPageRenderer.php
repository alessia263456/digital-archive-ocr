<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

final class DocumentPageRenderer
{
    private const DPI = 300;
    private const POINTS_PER_INCH = 72;

    public function __construct(
        private readonly int $inputBytes = 32 * 1024 * 1024,
        private readonly int $pages = 64,
        private readonly int $pixels = 180_000_000,
        private readonly int $memoryBytes = 512 * 1024 * 1024,
        private readonly int $outputBytes = 128 * 1024 * 1024,
        private readonly float $seconds = 60,
    ) {}

    /** @return list<array{page: int, path: string, width: int, height: int}> */
    public function render(string $input, string $destination): array
    {
        $deadline = hrtime(true) / 1e9 + $this->seconds;
        $input = realpath($input);
        $parent = realpath(dirname($destination));
        if (!$input || !is_file($input) || filesize($input) > $this->inputBytes || !$parent || !is_dir($parent)) {
            throw new RuntimeException('Sursa sau destinația conversiei este nevalidă.');
        }
        $destination = $parent.'/'.basename($destination);
        $stage = $parent.'/.render-'.bin2hex(random_bytes(16));
        if (!mkdir($stage, 0700)) {
            throw new RuntimeException('Directorul temporar nu poate fi creat.');
        }

        try {
            // Inspect and render the same bounded snapshot, even if the caller replaces the input.
            $source = $stage.'/source';
            $this->snapshot($input, $source);
            $signature = file_get_contents($source, false, null, 0, 8);
            $pdf = str_starts_with($signature, '%PDF-');
            if (!$pdf && $signature !== "\x89PNG\r\n\x1a\n" && !str_starts_with($signature, "\xff\xd8\xff")) {
                throw new RuntimeException('Format de document neacceptat.');
            }
            $count = $pdf ? $this->pdfCount($source, $deadline) : 1;
            if ($count < 1 || $count > $this->pages) {
                throw new RuntimeException('Numărul de pagini depășește limita.');
            }
            $remainingPixels = $this->pixels;
            $remainingBytes = $this->outputBytes;
            $result = [];
            for ($page = 1; $page <= $count; $page++) {
                $name = "page-$page.png";
                $path = "$stage/$name";
                if ($remainingBytes <= 0 || $remainingPixels <= 0) {
                    throw new RuntimeException('Limita de conversie a fost depășită.');
                }
                if ($pdf) {
                    $this->renderPdfPage($source, $page, $path, $remainingPixels, $remainingBytes, $deadline);
                } else {
                    $this->image('render', $source, $remainingPixels, $remainingBytes, $deadline, $path);
                }

                $dimensions = $this->image('verify', $path, $remainingPixels, $remainingBytes, $deadline);
                [$width, $height] = array_map('intval', explode(' ', $dimensions));
                $remainingPixels -= $width * $height;
                $remainingBytes -= filesize($path);
                $result[] = ['page' => $page, 'path' => "$destination/$name", 'width' => $width, 'height' => $height];
            }

            unlink($source);
            $this->publish($stage, $destination, $deadline);
            return $result;
        } finally {
            if (is_dir($stage)) {
                foreach (new \FilesystemIterator($stage) as $file) {
                    unlink($file->getPathname());
                }
                rmdir($stage);
            }
        }
    }

    private function snapshot(string $input, string $target): void
    {
        $source = fopen($input, 'rb');
        $output = fopen($target, 'xb');
        try {
            $bytes = stream_copy_to_stream($source, $output, $this->inputBytes + 1);
            if (!$bytes || $bytes > $this->inputBytes || !fflush($output)) {
                throw new RuntimeException('Dimensiunea documentului este nevalidă.');
            }
        } finally {
            fclose($source);
            fclose($output);
        }
    }

    private function pdfCount(string $source, float $deadline): int
    {
        $info = $this->run(['pdfinfo', $source], $deadline, 0);
        if (!preg_match('/^Pages:\s+(\d+)$/m', $info, $match)) {
            throw new RuntimeException('Numărul de pagini nu poate fi citit.');
        }
        return (int) $match[1];
    }

    private function renderPdfPage(string $source, int $page, string $path, int $pixels, int $bytes, float $deadline): void
    {
        $range = ['-f', (string) $page, '-l', (string) $page];
        $info = $this->run(['pdfinfo', ...$range, $source], $deadline, 0);
        if (!preg_match('/^Page\s+'.$page.' size:\s+([\d.]+) x ([\d.]+) pts/m', $info, $match)) {
            throw new RuntimeException('Dimensiunile paginii PDF sunt nevalide.');
        }
        $width = ceil((float) $match[1] * self::DPI / self::POINTS_PER_INCH);
        $height = ceil((float) $match[2] * self::DPI / self::POINTS_PER_INCH);
        if ($width < 1 || $height < 1 || $width * $height > $pixels) {
            throw new RuntimeException('Pagina PDF depășește limita de pixeli.');
        }

        $this->run(['pdftoppm', ...$range, '-r', (string) self::DPI, '-cropbox', '-singlefile',
            '-png', $source, substr($path, 0, -4)], $deadline, $bytes);
    }

    private function image(string $action, string $path, int $pixels, int $bytes, float $deadline, string ...$output): string
    {
        return $this->run([PHP_BINARY, '-d', 'gd.jpeg_ignore_warning=0', dirname(__DIR__, 2).'/bin/render-page.php',
            $action, $path, (string) $pixels, ...$output], $deadline, $bytes);
    }

    private function run(array $command, float $deadline, int $maxFileBytes): string
    {
        $process = new Process(['prlimit', '--core=0', '--as='.$this->memoryBytes, '--fsize='.$maxFileBytes, '--', ...$command],
            env: ['LC_ALL' => 'C', 'PATH' => getenv('PATH')], timeout: $this->timeLeft($deadline));
        // Keep document metadata and decoder diagnostics out of logs and bounded in memory.
        $output = '';
        $diagnostic = false;
        try {
            $process->run(function (string $type, string $data) use ($process, &$output, &$diagnostic) {
                if ($type === Process::ERR) {
                    $diagnostic = true;
                    $process->clearErrorOutput();
                } else {
                    $output .= $data;
                    $process->clearOutput();
                    if (strlen($output) > 65536) {
                        throw new RuntimeException('Răspunsul convertorului depășește limita.');
                    }
                }
            });
            if (!$process->isSuccessful() || $diagnostic) {
                throw new RuntimeException('Conversia documentului a eșuat.');
            }
            return trim($output);
        } catch (ProcessTimedOutException) {
            throw new RuntimeException('Timpul de conversie a expirat.');
        } finally {
            $process->stop(0);
        }
    }

    private function timeLeft(float $deadline): float
    {
        $remaining = $deadline - hrtime(true) / 1e9;
        if ($remaining <= 0) {
            throw new RuntimeException('Timpul de conversie a expirat.');
        }
        return $remaining;
    }

    private function publish(string $stage, string $destination, float $deadline): void
    {
        // Lock the stable parent inode only during publication. No disposable lock-file race.
        $lock = fopen(dirname($destination), 'r');
        try {
            while (!flock($lock, LOCK_EX | LOCK_NB)) {
                $this->timeLeft($deadline);
                usleep(1000);
            }
            $this->timeLeft($deadline);
            clearstatcache(true, $destination);
            if (file_exists($destination) || is_link($destination) || !rename($stage, $destination)) {
                throw new RuntimeException('Paginile nu pot fi publicate la destinație.');
            }
        } finally {
            fclose($lock);
        }
    }
}
