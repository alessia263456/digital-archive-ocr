<?php

namespace App\Services;

use RuntimeException;

final class OcrTsv
{
    public static function words(string $tsv, int $width, int $height): array
    {
        $lines = explode("\n", rtrim(str_replace("\r\n", "\n", $tsv), "\n"));
        $header = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
        if (array_shift($lines) !== $header || !mb_check_encoding($tsv, 'UTF-8')) {
            throw new RuntimeException('Antet TSV sau codificare nevalidă.');
        }

        $words = [];
        foreach ($lines as $line) {
            $cells = explode("\t", $line, 12);
            if (count($cells) !== 12 || count(array_filter(array_slice($cells, 0, 10), 'ctype_digit')) !== 10
                || !in_array($cells[0], ['1','2','3','4','5'], true) || $cells[1] !== '1') {
                throw new RuntimeException('Rând TSV nevalid.');
            }
            if ($cells[0] !== '5' || trim($cells[11]) === '') {
                continue;
            }
            [$left, $top, $w, $h] = array_map('intval', array_slice($cells, 6, 4));
            $confidence = (float) $cells[10];
            if (!is_numeric($cells[10]) || $confidence < 0 || $confidence > 100 || !$w || !$h
                || $left > $width - $w || $top > $height - $h) {
                throw new RuntimeException('Cuvânt TSV nevalid.');
            }
            $words[] = ['text' => $cells[11], 'confidence' => $confidence, 'left' => $left,
                'top' => $top, 'width' => $w, 'height' => $h];
        }
        return $words;
    }
}
