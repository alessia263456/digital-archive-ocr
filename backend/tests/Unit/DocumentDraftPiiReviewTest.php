<?php

namespace Tests\Unit;

use App\Services\DocumentDraftPiiReview;
use Tests\TestCase;

final class DocumentDraftPiiReviewTest extends TestCase
{
    public function test_corrected_text_spans_use_javascript_unicode_offsets_and_candidates_remain_value_free(): void
    {
        $words = [
            ['text' => '📄', 'confidence' => 99, 'left' => 0, 'top' => 0, 'width' => 12, 'height' => 10],
            ['text' => 'Știință', 'confidence' => 99, 'left' => 14, 'top' => 0, 'width' => 30, 'height' => 10],
            ['text' => 'CNP', 'confidence' => 99, 'left' => 46, 'top' => 0, 'width' => 20, 'height' => 10],
            ['text' => '1960523123456', 'confidence' => 99, 'left' => 68, 'top' => 0, 'width' => 50, 'height' => 10],
        ];
        $page = (object) ['page' => 1, 'words' => json_encode($words, JSON_THROW_ON_ERROR)];

        $candidates = (new DocumentDraftPiiReview)->detect([$page], [['page' => 1, 'text' => '📄 Știință CNP 1960523123456']]);

        self::assertCount(1, $candidates);
        self::assertSame(['start' => 15, 'length' => 13], $candidates[0]['corrected_text_span']);
        self::assertSame('reliable', $candidates[0]['location_status']);
        self::assertStringNotContainsString('1960523123456', json_encode($candidates, JSON_THROW_ON_ERROR));
    }

    public function test_three_image_page_shapes_keep_known_candidate_locations(): void
    {
        $number = '1960523123456';
        $pages = [];
        foreach ([
            ['CNP '.$number, ['CNP', $number]],
            ['CNP '.$number.' CNP '.$number, ['CNP', $number, 'CNP', $number]],
            ['CNP 1960523123450', ['CNP', '1960523123450']],
        ] as $index => [$text, $tokens]) {
            $words = [];
            foreach ($tokens as $position => $token) {
                $words[] = ['text' => $token, 'confidence' => 99, 'left' => $position * 60,
                    'top' => 1, 'width' => 50, 'height' => 10];
            }
            $pages[] = (object) ['page' => $index + 1, 'text' => $text,
                'words' => json_encode($words, JSON_THROW_ON_ERROR)];
        }
        $corrected = [
            ['page' => 1, 'text' => $pages[0]->text],
            ['page' => 2, 'text' => $pages[1]->text],
            ['page' => 3, 'text' => 'CNP '.$number, 'base_text' => $pages[2]->text,
                'operations' => [['start' => 16, 'deleted' => '0', 'inserted' => '6']]],
        ];
        $candidates = (new DocumentDraftPiiReview)->detect($pages, $corrected);
        self::assertGreaterThanOrEqual(3, count($candidates));
        foreach ($candidates as $candidate) {
            self::assertSame('reliable', $candidate['location_status']);
            self::assertNotEmpty($candidate['bounding_boxes']);
        }
        self::assertContains(3, array_column($candidates, 'page'));
    }
}
