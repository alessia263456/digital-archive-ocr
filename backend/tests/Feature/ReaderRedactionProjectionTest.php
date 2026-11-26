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

    public function test_accepted_candidate_without_reliable_geometry_fails_closed(): void
    {
        $this->expectException(\RuntimeException::class);
        (new ReaderRedactionProjection)->project($this->pages(), [
            ['review_status' => 'accepted', 'page' => 1, 'location_status' => 'manual_review_required',
                'bounding_boxes' => [], 'corrected_text_span' => ['start' => 4, 'length' => 9]],
        ], [], ['year' => '2024']);
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
