<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;

final class RedactedPdf
{
    /** Boxes are grouped by one-based renderer page number. */
    public function create(string $source, array $boxes, string $destination): void
    {
        $work = dirname($destination).'/.redaction-'.bin2hex(random_bytes(16));
        if (!mkdir($work, 0700)) {
            throw new RuntimeException('Director temporar indisponibil.');
        }
        try {
            $pages = (new DocumentPageRenderer)->render($source, "$work/pages");
            $images = [];
            foreach ($pages as $page) {
                $image = imagecreatefrompng($page['path']);
                if (!imageistruecolor($image)) {
                    imagepalettetotruecolor($image);
                }
                $black = imagecolorallocate($image, 0, 0, 0);
                if (array_key_exists($page['page'], $boxes) && !is_array($boxes[$page['page']])) {
                    throw new RuntimeException('Lista de coordonate este nevalidă.');
                }
                foreach ($boxes[$page['page']] ?? [] as $box) {
                    foreach (['left', 'top', 'width', 'height'] as $field) {
                        if (!is_int($box[$field] ?? null)) {
                            throw new RuntimeException('Coordonate nevalide.');
                        }
                    }
                    ['left' => $x, 'top' => $y, 'width' => $w, 'height' => $h] = $box;
                    if ($x < 0 || $y < 0 || $w < 1 || $h < 1 || $x > $page['width'] - $w || $y > $page['height'] - $h) {
                        throw new RuntimeException('Coordonate în afara paginii.');
                    }
                    imagefilledrectangle($image, $x, $y, $x+$w-1, $y+$h-1, $black);
                }
                unset($boxes[$page['page']]);
                $path = "$work/".$page['page'].'.png';
                if (!imagepng($image, $path)) {
                    throw new RuntimeException('Scrierea paginii a eșuat.');
                }
                unset($image);
                $images[] = $path;
            }
            if ($boxes) {
                throw new RuntimeException('Pagina indicată lipsește.');
            }
            $writer = new Process(['img2pdf', '--imgsize', '300dpi', '--output', "$work/result.pdf", ...$images]);
            $writer->disableOutput();
            if ($writer->run() || !link("$work/result.pdf", $destination)) {
                throw new RuntimeException('Publicarea PDF a eșuat.');
            }
        } finally {
            File::deleteDirectory($work);
        }
    }
}
