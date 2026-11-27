<?php

namespace Tests\Feature;

use App\Services\ReaderRedactionProjection;
use PHPUnit\Framework\TestCase;

final class ReaderRedactionProjectionTest extends TestCase
{
    public function test_projection_removes_overlapping_tokens_and_repeated_sensitive_metadata(): void
    {
        $result = (new ReaderRedactionProjection)->project($this->pages(), [
            ['review_status' => 'accepted', 'page' => 1, 'location_status' => 'reliable',
                'bounding_boxes' => [['left' => 20, 'top' => 10, 'width' => 20, 'height' => 10]],
                'corrected_text_span' => ['start' => 4, 'length' => 9]],
        ], [], ['titlu' => 'Declarație John Doe', 'year' => 2024]);

        self::assertSame('CNP pentru contract', $result['pages'][0]['text']);
        self::assertArrayNotHasKey('titlu', $result['metadata']);
        self::assertSame(2024, $result['metadata']['year']);
    }

    public function test_manual_mark_removes_all_tokens_it_overlaps(): void
    {
        $result = (new ReaderRedactionProjection)->project($this->pages(), [], [
            ['page' => 1, 'box' => ['left' => 20, 'top' => 10, 'width' => 20, 'height' => 10]],
        ], ['name' => 'John Doe', 'year' => '2024']);

        self::assertSame('CNP pentru contract', $result['pages'][0]['text']);
        self::assertArrayNotHasKey('name', $result['metadata']);
    }

    public function test_candidate_without_reliable_geometry_is_discarded_from_reader_redaction_projection(): void
    {
        $result = (new ReaderRedactionProjection)->project($this->pages(), [
            ['review_status' => 'accepted', 'page' => 1, 'location_status' => 'manual_review_required',
                'bounding_boxes' => [], 'corrected_text_span' => ['start' => 4, 'length' => 9]],
        ], [], ['name' => 'John Doe', 'year' => '2024']);

        self::assertSame('CNP John Doe pentru contract', $result['pages'][0]['text']);
        self::assertSame(['name' => 'John Doe', 'year' => '2024'], $result['metadata']);
    }

    public function test_corrected_token_and_overlapping_original_box_are_removed(): void
    {
        $pages = $this->pages();
        $pages[0]['source_text'] = $pages[0]['text'];
        $pages[0]['base_text'] = $pages[0]['text'];
        $pages[0]['text'] = 'CNP Jonn Doe pentru contract';
        $pages[0]['operations'] = [['start' => 6, 'deleted' => 'h', 'inserted' => 'n']];
        $result = (new ReaderRedactionProjection)->project($pages, [
            ['review_status' => 'accepted', 'page' => 1, 'location_status' => 'reliable',
                'bounding_boxes' => [['left' => 20, 'top' => 10, 'width' => 20, 'height' => 10]],
                'corrected_text_span' => ['start' => 4, 'length' => 8]],
        ], [], ['titlu' => 'Jonn Doe', 'original' => 'John Doe']);
        self::assertSame('CNP pentru contract', $result['pages'][0]['text']);
        self::assertSame([], $result['metadata']);
    }

    public function test_page_with_unmatched_corrected_ocr_is_omitted_from_reader_search(): void
    {
        $pages = $this->pages();
        $pages[0]['source_text'] = $pages[0]['text'];
        $pages[0]['base_text'] = 'CNP John Doe revised text';
        $pages[0]['text'] = $pages[0]['base_text'];
        $result = (new ReaderRedactionProjection)->project($pages, [
            ['id' => 'candidate-john-doe', 'disposition' => 'redact', 'page' => 1,
                'location_status' => 'reliable',
                'bounding_boxes' => [['left' => 20, 'top' => 10, 'width' => 30, 'height' => 10]],
                'corrected_text_span' => ['start' => 4, 'length' => 8]],
        ], [], ['name' => 'John Doe']);

        self::assertSame('', $result['pages'][0]['text']);
        self::assertSame([], $result['metadata']);
    }

    private function pages(): array
    {
        return [[
            'page' => 1, 'width' => 100, 'height' => 200,
            'text' => 'CNP John Doe pentru contract',
            'words' => [
                ['text' => 'CNP', 'left' => 1, 'top' => 10, 'width' => 10, 'height' => 10],
                ['text' => 'John', 'left' => 22, 'top' => 10, 'width' => 10, 'height' => 10],
                ['text' => 'Doe', 'left' => 35, 'top' => 10, 'width' => 10, 'height' => 10],
                ['text' => 'pentru', 'left' => 50, 'top' => 10, 'width' => 10, 'height' => 10],
                ['text' => 'contract', 'left' => 65, 'top' => 10, 'width' => 15, 'height' => 10],
            ],
        ]];
    }
}
