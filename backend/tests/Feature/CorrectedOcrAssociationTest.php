<?php

namespace Tests\Feature;

use App\Services\CorrectedOcrAssociation;
use PHPUnit\Framework\TestCase;

final class CorrectedOcrAssociationTest extends TestCase
{
    public function test_repeated_words_keep_their_distinct_source_positions(): void
    {
        $result = (new CorrectedOcrAssociation)->map('Ana Ana Ana', $this->words('Ana', 'Ana', 'Ana'), 'Ana Ana Ana', []);
        self::assertSame([[0], [1], [2]], $result['mapping']);
    }

    public function test_character_correction_split_and_merge_keep_original_boxes(): void
    {
        $service = new CorrectedOcrAssociation;
        self::assertSame([[0]], $service->map('Jon', $this->words('Jon'), 'Jon', [
            ['start' => 2, 'deleted' => 'n', 'inserted' => 'hn'],
        ])['mapping']);
        self::assertSame([[0]], $service->map('ohn', $this->words('ohn'), 'ohn', [
            ['start' => 0, 'deleted' => '', 'inserted' => 'J'],
        ])['mapping']);
        self::assertSame([[0], [0]], $service->map('CNP123', $this->words('CNP123'), 'CNP123', [
            ['start' => 3, 'deleted' => '', 'inserted' => ' '],
        ])['mapping']);
        self::assertSame([[0, 1]], $service->map('Ana Pop', $this->words('Ana', 'Pop'), 'Ana Pop', [
            ['start' => 3, 'deleted' => ' ', 'inserted' => ''],
        ])['mapping']);
    }

    public function test_new_word_is_unlocated_while_unaffected_words_keep_boxes(): void
    {
        $service = new CorrectedOcrAssociation;
        self::assertSame([[0], [], [1]], $service->map('Ana Pop', $this->words('Ana', 'Pop'), 'Ana Pop', [
            ['start' => 4, 'deleted' => '', 'inserted' => 'nou '],
        ])['mapping']);
        self::assertSame([[0], [2]], $service->map('Ana nou Pop', $this->words('Ana', 'nou', 'Pop'), 'Ana nou Pop', [
            ['start' => 4, 'deleted' => 'nou ', 'inserted' => ''],
        ])['mapping']);
    }

    public function test_utf16_offsets_and_undo_replay(): void
    {
        $result = (new CorrectedOcrAssociation)->map('😀 Ana', $this->words('😀', 'Ana'), '😀 Ana', [
            ['start' => 3, 'deleted' => 'A', 'inserted' => 'Ă'],
            ['start' => 3, 'deleted' => 'Ă', 'inserted' => 'A'],
        ]);
        self::assertSame('😀 Ana', $result['text']);
        self::assertSame([[0], [1]], $result['mapping']);
    }

    private function words(string ...$values): array
    {
        return array_map(static fn (string $text): array => ['text' => $text], $values);
    }
}
