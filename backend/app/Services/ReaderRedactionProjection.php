<?php

namespace App\Services;

final class ReaderRedactionProjection
{
    public function project(array $pages, array $candidates, array $manualMarks, array $metadata, array $excludedCandidateIds = []): array
    {
        $byPage = [];
        foreach ($pages as $page) {
            if (!is_int($page['page'] ?? null) || !is_int($page['width'] ?? null) || !is_int($page['height'] ?? null)
                || !is_string($page['text'] ?? null) || !is_array($page['words'] ?? null)
                || $page['page'] < 1 || $page['width'] < 1 || $page['height'] < 1) throw new \RuntimeException('Datele OCR nu permit filtrarea sigură.');
            $byPage[(int) $page['page']] = $page;
        }
        if ($byPage === []) throw new \RuntimeException('Nu există pagini OCR pentru filtrare.');

        $regions = [];
        $phrases = [];
        $candidateSpans = [];
        $manualPages = array_fill_keys(array_map(static fn (array $mark): int => (int) ($mark['page'] ?? 0), $manualMarks), true);
        foreach ((new RedactionState)->includedCandidates($candidates, $excludedCandidateIds) as $candidate) {
            if (!isset($candidate['page'], $candidate['corrected_text_span']['start'], $candidate['corrected_text_span']['length'])) {
                throw new \RuntimeException('O anonimizare inclusă nu are un pasaj OCR valid.');
            }
            $pageNumber = (int) $candidate['page'];
            $page = $byPage[$pageNumber] ?? throw new \RuntimeException('Lipsește pagina unei anonimizări incluse.');
            $span = $candidate['corrected_text_span'];
            $start = $this->utf16ByteOffset((string) $page['text'], (int) $span['start']);
            $end = $this->utf16ByteOffset((string) $page['text'], (int) ($span['start'] + $span['length']));
            if ($end <= $start) throw new \RuntimeException('Pasajul anonimizat nu este valid.');
            $phrases[] = substr((string) $page['text'], $start, $end - $start);
            $candidateSpans[$pageNumber][] = [$start, $end];
            if (($candidate['location_status'] ?? null) !== 'reliable' || !is_array($candidate['bounding_boxes'] ?? null) || $candidate['bounding_boxes'] === []) {
                if (!isset($manualPages[$pageNumber])) throw new \RuntimeException('O anonimizare inclusă necesită marcaj manual.');
                continue;
            }
            foreach ($candidate['bounding_boxes'] as $box) $regions[$pageNumber][] = $this->validatedBox($box, $page);
        }
        foreach ($manualMarks as $mark) {
            $pageNumber = (int) ($mark['page'] ?? 0);
            $page = $byPage[$pageNumber] ?? throw new \RuntimeException('Lipsește pagina unui marcaj manual.');
            if (!isset($mark['box']) || !is_array($mark['box'])) throw new \RuntimeException('Marcajul manual nu este valid.');
            $regions[$pageNumber][] = $this->validatedBox($mark['box'], $page);
        }

        foreach ($regions as $pageNumber => $boxes) {
            $page = $byPage[$pageNumber];
            $text = (string) $page['text'];
            $tokens = $this->textTokens($text);
            $words = $page['words'];
            $sourceText = (string) ($page['source_text'] ?? $text);
            $association = (new CorrectedOcrAssociation)->map(
                $sourceText, $words, (string) ($page['base_text'] ?? $text), $page['operations'] ?? []
            );
            if ($association['text'] !== $text) throw new \RuntimeException('Textul OCR nu se aliniază sigur cu geometria.');
            $redactedWords = [];
            $spans = [];
            foreach ($words as $index => $word) {
                if (!is_string($word['text'] ?? null) || !is_int($word['left'] ?? null) || !is_int($word['top'] ?? null)
                    || !is_int($word['width'] ?? null) || !is_int($word['height'] ?? null)
                    || $word['left'] < 0 || $word['top'] < 0 || $word['width'] < 1 || $word['height'] < 1
                    || $word['left'] + $word['width'] > $page['width'] || $word['top'] + $word['height'] > $page['height']) {
                    throw new \RuntimeException('Geometria OCR nu este completă.');
                }
                foreach ($boxes as $box) {
                    if ($this->overlaps($box, $word)) {
                        $redactedWords[$index] = true;
                        $phrases[] = (string) $word['text'];
                        break;
                    }
                }
            }
            if ($redactedWords === []) throw new \RuntimeException('O regiune anonimizată nu corespunde unui cuvânt OCR.');
            foreach ($tokens as $index => $token) {
                $mapped = $association['mapping'][$index] ?? [];
                $inCandidate = false;
                foreach ($candidateSpans[$pageNumber] ?? [] as [$start, $end]) {
                    if ($token['start'] < $end && $token['end'] > $start) $inCandidate = true;
                }
                if ($mapped === [] && !$inCandidate) {
                    // Keep publication safe when corrected OCR has unassociated tokens:
                    // omit this page from reader search instead of indexing uncertain text.
                    $byPage[$pageNumber]['text'] = '';
                    continue 2;
                }
                foreach ($mapped as $sourceIndex) {
                    if (isset($redactedWords[$sourceIndex])) $inCandidate = true;
                }
                if ($inCandidate) $spans[] = [$token['start'], $token['end']];
            }
            if ($spans === []) throw new \RuntimeException('O regiune anonimizată nu corespunde textului OCR.');
            foreach ($spans as [$start, $end]) $phrases[] = substr($text, $start, $end - $start);
            usort($spans, static fn (array $a, array $b): int => $b[0] <=> $a[0]);
            foreach ($spans as [$start, $end]) $text = substr_replace($text, '', $start, $end - $start);
            $text = preg_replace('/[ \t]{2,}/u', ' ', $text) ?? throw new \RuntimeException('Textul anonimizat nu poate fi pregătit.');
            $byPage[$pageNumber]['text'] = trim($text);
        }

        $phrases = array_values(array_unique(array_filter(array_map(fn (string $value): string => $this->normalize($value), $phrases))));
        return [
            'pages' => array_values(array_map(static fn (array $page): array => ['page' => (int) $page['page'], 'text' => $page['text']], $byPage)),
            'metadata' => $this->sanitizeMetadata($metadata, $phrases),
        ];
    }

    private function validatedBox(array $box, array $page): array
    {
        foreach (['left', 'top', 'width', 'height'] as $field) if (!is_int($box[$field] ?? null)) throw new \RuntimeException('Coordonatele anonimizării nu sunt valide.');
        if ($box['left'] < 0 || $box['top'] < 0 || $box['width'] < 1 || $box['height'] < 1
            || $box['left'] + $box['width'] > (int) $page['width'] || $box['top'] + $box['height'] > (int) $page['height']) {
            throw new \RuntimeException('Coordonatele anonimizării depășesc pagina.');
        }
        return $box;
    }

    private function overlaps(array $box, array $word): bool
    {
        return $box['left'] < (int) $word['left'] + (int) $word['width']
            && $box['left'] + $box['width'] > (int) $word['left']
            && $box['top'] < (int) $word['top'] + (int) $word['height']
            && $box['top'] + $box['height'] > (int) $word['top'];
    }

    private function textTokens(string $text): array
    {
        preg_match_all('/\S+/u', $text, $matches, PREG_OFFSET_CAPTURE);
        return array_map(static fn (array $match): array => [
            'text' => $match[0], 'start' => $match[1], 'end' => $match[1] + strlen($match[0]),
        ], $matches[0]);
    }

    private function utf16ByteOffset(string $text, int $units): int
    {
        if ($units < 0) throw new \RuntimeException('Pasajul anonimizat nu este valid.');
        $encoded = mb_convert_encoding($text, 'UTF-16LE', 'UTF-8');
        if ($units * 2 > strlen($encoded)) throw new \RuntimeException('Pasajul anonimizat nu este valid.');
        $prefix = mb_convert_encoding(substr($encoded, 0, $units * 2), 'UTF-8', 'UTF-16LE');
        return strlen($prefix);
    }

    private function normalize(string $value): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $value) ?? $value), 'UTF-8');
    }

    private function sanitizeMetadata(array $metadata, array $phrases): array
    {
        $clean = [];
        foreach ($metadata as $key => $value) {
            if (is_string($value)) {
                $normalized = $this->normalize($value);
                if ($normalized === '' || $this->containsSensitivePhrase($normalized, $phrases)) continue;
                $clean[$key] = $value;
            } elseif (is_array($value)) {
                $nested = $this->sanitizeMetadata($value, $phrases);
                if ($nested !== []) $clean[$key] = $nested;
            } else {
                $clean[$key] = $value;
            }
        }
        return $clean;
    }

    private function containsSensitivePhrase(string $value, array $phrases): bool
    {
        foreach ($phrases as $phrase) if (str_contains($value, $phrase)) return true;
        return false;
    }
}
