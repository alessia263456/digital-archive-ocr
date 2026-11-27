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
            $corrected = $correctedPages[$position] ?? [];
            $sourceText = (string) ($page->text ?? implode(' ', array_column($source, 'text')));
            $association = (new CorrectedOcrAssociation)->map(
                $sourceText, $source, (string) ($corrected['base_text'] ?? $text),
                $corrected['operations'] ?? []
            );
            if ($association['text'] !== $text) throw new \RuntimeException('Corecturile OCR nu corespund textului.');
            $mapping = $association['mapping'];
            $detectorWords = [];
            $line = 1;
            foreach ($tokens as $index => $token) {
                $sourceWord = count($mapping[$index]) === 1 ? ($source[$mapping[$index][0]] ?? []) : [];
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
                $mapped = array_map(static fn (int $index): array => $mapping[$index] ?? [], $selected);
                $sourceIndexes = array_values(array_unique(array_merge(...$mapped)));
                sort($sourceIndexes);
                $reliable = !in_array([], $mapped, true) && $sourceIndexes !== []
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

}
