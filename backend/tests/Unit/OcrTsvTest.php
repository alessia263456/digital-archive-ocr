<?php

namespace Tests\Unit;

use App\Services\OcrTsv;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class OcrTsvTest extends TestCase
{
    private const HEADER = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n";

    public function test_preserves_word_text_confidence_and_geometry(): void
    {
        $words = OcrTsv::words(self::HEADER."5\t1\t1\t1\t1\t1\t0\t1\t10\t9\t96.75\tȘtiință\n", 10, 10);
        self::assertSame([['text' => 'Știință', 'confidence' => 96.75, 'left' => 0, 'top' => 1, 'width' => 10, 'height' => 9]], $words);
    }

    public function test_blank_page(): void
    {
        self::assertSame([], OcrTsv::words(self::HEADER, 10, 10));
    }

    public function test_invalid_confidence(): void
    {
        $this->expectException(RuntimeException::class);
        OcrTsv::words(self::HEADER."5\t1\t1\t1\t1\t1\t0\t0\t1\t1\t101\tx", 10, 10);
    }

    public function test_outside_page(): void
    {
        $this->expectException(RuntimeException::class);
        OcrTsv::words(self::HEADER."5\t1\t1\t1\t1\t1\t1\t1\t10\t9\t90\tx", 10, 10);
    }
}
