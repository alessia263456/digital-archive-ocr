<?php

namespace Tests\Feature;

use App\Services\PiiDetector;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class PiiDetectionTest extends TestCase
{
    public function test_candidate_keeps_persisted_page_number_and_ocr_boxes_without_matched_text(): void
    {
        $this->artisan('migrate')->assertExitCode(0);
        $extraction = (string) Str::uuid();
        $firstTwelve = '180010122001';
        $sum = 0;
        foreach (str_split('279146358279') as $index => $weight) {
            $sum += (int) $firstTwelve[$index] * (int) $weight;
        }
        $cnp = $firstTwelve.(($sum % 11) === 10 ? '1' : (string) ($sum % 11));
        $words = [
            ['text' => 'CNP', 'confidence' => 98, 'left' => 5, 'top' => 10, 'width' => 25, 'height' => 10,
                'block_num' => 1, 'paragraph_num' => 1, 'line_num' => 2, 'word_num' => 1],
            ['text' => substr($cnp, 0, 6), 'confidence' => 96, 'left' => 35, 'top' => 10, 'width' => 40, 'height' => 10,
                'block_num' => 1, 'paragraph_num' => 1, 'line_num' => 2, 'word_num' => 2],
            ['text' => substr($cnp, 6), 'confidence' => 94, 'left' => 80, 'top' => 10, 'width' => 45, 'height' => 10,
                'block_num' => 1, 'paragraph_num' => 1, 'line_num' => 2, 'word_num' => 3],
        ];
        DB::table('ocr_pages')->insert([
            'extraction' => $extraction, 'source_sha256' => str_repeat('a', 64), 'page' => 2,
            'width' => 200, 'height' => 300, 'text' => 'sintetic', 'tsv' => 'fixture TSV',
            'words' => json_encode($words, JSON_THROW_ON_ERROR),
        ]);

        try {
            $page = DB::table('ocr_pages')->where('extraction', $extraction)->sole();
            $candidate = (new PiiDetector)->detect(json_decode($page->words, true, flags: JSON_THROW_ON_ERROR), (int) $page->page)[0];

            self::assertSame(2, $candidate['page']);
            self::assertSame('redact', $candidate['disposition']);
            self::assertSame([
                ['left' => 35, 'top' => 10, 'width' => 40, 'height' => 10],
                ['left' => 80, 'top' => 10, 'width' => 45, 'height' => 10],
            ], $candidate['bounding_boxes']);
            self::assertStringNotContainsString($cnp, json_encode($candidate, JSON_THROW_ON_ERROR));
        } finally {
            DB::table('ocr_pages')->where('extraction', $extraction)->delete();
        }
    }
}
