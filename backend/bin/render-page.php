<?php

// This helper runs under the renderer's OS memory, file-size and time limits.
set_error_handler(static function (): never {
    throw new RuntimeException('Imagine nevalidă.');
});

try {
    [, $action, $source, $remainingPixels] = $argv;
    [$width, $height, $type] = getimagesize($source);
    if ($height < 1 || $width < 1 || $width > intdiv((int) $remainingPixels, $height)) {
        throw new RuntimeException('Dimensiuni nepermise.');
    }

    $image = match ($type) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($source),
        IMAGETYPE_PNG => imagecreatefrompng($source),
        default => false,
    };
    if (!$image || imagesx($image) !== $width || imagesy($image) !== $height) {
        throw new RuntimeException('Imagine nevalidă.');
    }

    if ($action === 'render') {
        // Preserve PNG precision and transparency, including 16-bit source channels.
        $ok = $type === IMAGETYPE_PNG ? copy($source, $argv[4]) : imagepng($image, $argv[4]);
        if (!$ok) {
            throw new RuntimeException('Scriere eșuată.');
        }
    } elseif ($action !== 'verify' || $type !== IMAGETYPE_PNG) {
        throw new RuntimeException('Pagina generată nu este PNG.');
    }

    echo "$width $height";
} catch (Throwable) {
    fwrite(STDERR, "Conversia imaginii a eșuat.\n");
    exit(1);
}
