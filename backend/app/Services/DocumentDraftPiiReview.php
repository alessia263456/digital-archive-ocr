<?php

namespace App\Services;

use Illuminate\Support\Str;

class DocumentDraftPiiReview
{
    public function detect(array $pages, array $correctedPages): array
    {
        $result = [];
        foreach ($pages as $position => $page) {
            $text = (string) ($correctedPages[$position]['text'] ?? '');
            $tokens = $this->tokens($text);
            $source = json_decode($page->words, true, flags: JSON_THROW_ON_ERROR);
            $mapping = $this->alignment($source, $tokens);
            $detectorWords = [];
            $line = 1;
            foreach ($tokens as $index => $token) {
                $sourceWord = $mapping[$index] !== null ? ($source[$mapping[$index]] ?? []) : [];
                $line += substr_count(substr($text, $tokens[$index - 1]['byte_end'] ?? 0, $token['byte_start'] - ($tokens[$index - 1]['byte_end'] ?? 0)), "\n");
                $detectorWords[] = [
                    'text' => $token['text'], 'confidence' => (float) ($sourceWord['confidence'] ?? 0),
                    'block_num' => 1, 'line_num' => $line,
                    'word_num' => $index + 1,
                    '_review_index' => $index,
                ];
            }

            foreach ((new PiiDetector)->detectWithWordIndexes($detectorWords, (int) $page->page) as $candidate) {
                $indexes = $candidate['word_indexes'];
                unset($candidate['word_indexes']);
                $selected = array_values(array_filter($indexes, static fn (int $index): bool => isset($tokens[$index])));
                if ($selected === []) {
                    continue;
                }
                $start = min(array_map(static fn (int $index): int => $tokens[$index]['start'], $selected));
                $end = max(array_map(static fn (int $index): int => $tokens[$index]['end'], $selected));
                $sourceIndexes = array_map(static fn (int $index): ?int => $mapping[$index] ?? null, $selected);
                $reliable = !in_array(null, $sourceIndexes, true)
                    && count(array_unique($sourceIndexes)) === count($sourceIndexes)
                    && $sourceIndexes === range(min($sourceIndexes), max($sourceIndexes));
                $boxes = [];
                if ($reliable) {
                    foreach ($sourceIndexes as $sourceIndex) {
                        $word = $source[$sourceIndex];
                        if (!isset($word['left'], $word['top'], $word['width'], $word['height'])) {
                            $reliable = false;
                            $boxes = [];
                            break;
                        }
                        $boxes[] = array_intersect_key($word, array_flip(['left', 'top', 'width', 'height']));
                    }
                }
                $candidate['id'] = (string) Str::uuid();
                $candidate['page'] = (int) $page->page;
                $candidate['bounding_boxes'] = $reliable ? $boxes : [];
                $candidate['location_status'] = $reliable ? 'reliable' : 'manual_review_required';
                if (!$reliable) $candidate['disposition'] = 'review';
                $candidate['corrected_text_span'] = ['start' => $start, 'length' => $end - $start];
                $candidate['review_status'] = 'pending';
                $result[] = $candidate;
            }
        }
        return $result;
    }

    private function tokens(string $text): array
    {
        preg_match_all('/\S+/u', $text, $matches, PREG_OFFSET_CAPTURE);
        $tokens = [];
        foreach ($matches[0] as [$value, $byteStart]) {
            $start = $this->utf16Length(substr($text, 0, $byteStart));
            $length = $this->utf16Length($value);
            $tokens[] = ['text' => $value, 'start' => $start, 'end' => $start + $length, 'byte_start' => $byteStart, 'byte_end' => $byteStart + strlen($value)];
        }
        return $tokens;
    }

    private function utf16Length(string $value): int
    {
        return intdiv(strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')), 2);
    }

    private function alignment(array $source, array $tokens): array
    {
        $sourceTexts = array_map(static fn (array $word): string => (string) ($word['text'] ?? ''), $source);
        $positions = [];
        foreach ($sourceTexts as $index => $value) $positions[$value][] = $index;
        $tokenPositions = [];
        foreach ($tokens as $index => $token) $tokenPositions[$token['text']][] = $index;

        $map = array_fill(0, count($tokens), null);
        foreach ($tokens as $index => $token) {
            $found = $positions[$token['text']] ?? [];
            if (count($found) !== 1 || count($tokenPositions[$token['text']] ?? []) !== 1) continue;
            $sourceIndex = $found[0];
            $hasNeighbor = ($index > 0 && isset($map[$index - 1]) && $map[$index - 1] === $sourceIndex - 1)
                || ($index + 1 < count($tokens) && ($sourceTexts[$sourceIndex + 1] ?? null) === $tokens[$index + 1]['text']);
            if ($hasNeighbor || (count($tokens) === 1 && count($source) === 1)) $map[$index] = $sourceIndex;
        }
        return $map;
    }
}
