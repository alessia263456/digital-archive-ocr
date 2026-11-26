<?php

namespace App\Services;

use App\Models\NomenclatureEntry;
use Illuminate\Support\Str;

final class MetadataSuggestionExtractor
{
    private const DATE = '(?:[0-3]?\d[.\/-][01]?\d[.\/-](?:19|20)\d{2}|[0-3]?\d\s+(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s+(?:19|20)\d{2})';

    private const AMOUNT = '(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:,\d{1,2})?\s*(?:lei|ron|euro|eur)';

    private const NUMBER = '\d{1,6}(?:\/\d{2,4})?';

    public function extract(array $pages): array
    {
        $candidates = [];
        foreach ($pages as $page) {
            $text = is_string($page['text'] ?? null) ? $page['text'] : '';
            $pageNumber = (int) ($page['page'] ?? 1);
            $this->extractMatches($candidates, $text, $pageNumber, 'act_date', [
                '~(?<source>\b(?:data actului|data autentificării|data autentificarii)\s*:?\s*'.self::DATE.')~iu',
                '~(?<source>\b(?:încheiat|încheiată|incheiat|incheiata)\s+astăzi,?\s*(?:la\s+data\s+de\s*)?'.self::DATE.')~iu',
            ], self::DATE);
            $this->extractMatches($candidates, $text, $pageNumber, 'contract_expiry', [
                '~(?<source>\bdata\s+expirării\s+contractului\s*:?\s*'.self::DATE.')~iu',
                '~(?<source>\bcontractul\s+expiră\s+la\s+(?:data\s+de\s*)?'.self::DATE.')~iu',
            ], self::DATE);
            $this->extractMatches($candidates, $text, $pageNumber, 'act_number', [
                '~(?<source>\b(?:actul\s+)?(?:a\s+fost\s+)?autentificat(?:ă)?\s+sub\s+nr\.?\s*(?<value>'.self::NUMBER.'))~iu',
                '~(?<source>\b(?:numărul|numarul)\s+actului\s*:?\s*(?<value>'.self::NUMBER.'))~iu',
                '~(?<source>\b(?:numărul|numarul)\s+de\s+autentificare\s*:?\s*(?<value>'.self::NUMBER.'))~iu',
            ]);
            $this->extractMatches($candidates, $text, $pageNumber, 'amount', [
                '~(?<source>\b(?:suma|valoarea|prețul|pretul|onorariul)\s+(?:de\s+)?(?<value>'.self::AMOUNT.'))~iu',
                '~(?<source>\b(?:în cuantum de|in cuantum de)\s+(?<value>'.self::AMOUNT.'))~iu',
            ]);
            $this->extractMatches($candidates, $text, $pageNumber, 'physical_dossier_number', [
                '~(?<source>\b(?:numărul|numarul)\s+dosarului\s+(?:fizic\s*)?(?:nr\.?\s*)?(?<value>'.self::NUMBER.'))~iu',
                '~(?<source>\bdosar\s+fizic\s+nr\.?\s*(?<value>'.self::NUMBER.'))~iu',
                '~(?<source>\bdosar\s+nr\.?\s*(?<value>'.self::NUMBER.'))~iu',
            ]);
            $this->extractMatches($candidates, $text, $pageNumber, 'inventory_number', [
                '~(?<source>\b(?:numărul|numarul)\s+de\s+inventar\s*:?\s*(?:nr\.?\s*)?(?<value>'.self::NUMBER.'))~iu',
                '~(?<source>\binventar\s+nr\.?\s*(?<value>'.self::NUMBER.'))~iu',
            ]);
        }

        $candidates = [...$candidates, ...$this->extractTags($pages)];
        usort($candidates, static fn (array $left, array $right) => [$left['_page'], $left['_offset']] <=> [$right['_page'], $right['_offset']]);

        $seen = [];
        return array_values(array_map(static function (array $candidate) use (&$seen): ?array {
            $key = $candidate['field']."\0".$candidate['value'];
            if (isset($seen[$key])) {
                return null;
            }
            $seen[$key] = true;
            unset($candidate['_page'], $candidate['_offset']);
            return $candidate;
        }, $candidates));
    }

    private function extractMatches(array &$candidates, string $text, int $page, string $field, array $patterns, ?string $datePattern = null): void
    {
        foreach ($patterns as $pattern) {
            if (! preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            foreach ($matches[0] as $index => [$whole, $offset]) {
                if ($datePattern !== null) {
                    $valueMatches = [];
                    if (! preg_match('~'. $datePattern .'~iu', $whole, $valueMatches)) {
                        continue;
                    }
                    $value = $this->normalizeDate($valueMatches[0]);
                    if ($value === null) {
                        continue;
                    }
                } else {
                    $value = trim($matches['value'][$index][0] ?? '');
                    if ($value === '') {
                        continue;
                    }
                }

                $source = $matches['source'][$index][0] ?? $whole;
                $candidates[] = [
                    'field' => $field,
                    'value' => $value,
                    'source' => $source,
                    'page' => $page,
                    '_page' => $page,
                    '_offset' => $offset,
                ];
            }
        }
    }

    private function normalizeDate(string $value): ?string
    {
        $value = trim($value);
        if (preg_match('/^\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}$/u', $value)) {
            $separator = preg_match('/[.\/-]/u', $value, $match) ? $match[0] : '.';
            $date = \DateTimeImmutable::createFromFormat('!d'.$separator.'m'.$separator.'Y', $value);
            $errors = \DateTimeImmutable::getLastErrors();
            return $date && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0))
                ? $date->format('Y-m-d')
                : null;
        }

        if (! preg_match('/^(\d{1,2})\s+([\pL]+)\s+(\d{4})$/iu', $value, $parts)) {
            return null;
        }
        $months = [
            'ianuarie' => 1, 'februarie' => 2, 'martie' => 3, 'aprilie' => 4,
            'mai' => 5, 'iunie' => 6, 'iulie' => 7, 'august' => 8,
            'septembrie' => 9, 'octombrie' => 10, 'noiembrie' => 11, 'decembrie' => 12,
        ];
        $month = $months[Str::lower(Str::ascii($parts[2]))] ?? null;
        if ($month === null || ! checkdate($month, (int) $parts[1], (int) $parts[3])) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', (int) $parts[3], $month, (int) $parts[1]);
    }

    private function extractTags(array $pages): array
    {
        $entries = NomenclatureEntry::query()->get(['document_type', 'subtype']);
        $suggestions = [];
        foreach ($pages as $page) {
            $text = Str::lower(Str::ascii((string) ($page['text'] ?? '')));
            $pageNumber = (int) ($page['page'] ?? 1);
            $explicitTypes = [];
            $subtypeTypes = [];
            foreach ($entries as $entry) {
                $type = $entry->document_type;
                if ($this->containsKeyword($text, Str::lower(Str::ascii($type)), $offset)) {
                    $explicitTypes[$type] = [
                        'field' => 'tags', 'value' => $type,
                        'source' => 'Tip recunoscut în nomenclator: '.$type,
                        'page' => $pageNumber, '_page' => $pageNumber, '_offset' => $offset,
                    ];
                }
                foreach (preg_split('/\s*[,;\/()]\s*/u', $entry->subtype, flags: PREG_SPLIT_NO_EMPTY) as $part) {
                    $keyword = trim($part);
                    $normalized = Str::lower(Str::ascii($keyword));
                    if ($normalized === '' || ! $this->containsKeyword($text, $normalized, $offset)) {
                        continue;
                    }
                    $subtypeTypes[$type] ??= [
                        'field' => 'tags', 'value' => $type,
                        'source' => 'Term recunoscut în nomenclator: '.$keyword,
                        'page' => $pageNumber, '_page' => $pageNumber, '_offset' => $offset,
                    ];
                }
            }
            $matchedTypes = $explicitTypes !== [] ? $explicitTypes : (count($subtypeTypes) === 1 ? $subtypeTypes : []);
            foreach ($matchedTypes as $type => $candidate) {
                $suggestions[$pageNumber.'-'.$type] = $candidate;
            }
        }
        return array_values($suggestions);
    }

    private function containsKeyword(string $text, string $keyword, ?int &$offset): bool
    {
        if ($keyword === '' || ! preg_match('/(?<![\pL\pN])'.preg_quote($keyword, '/').'(?![\pL\pN])/u', $text, $match, PREG_OFFSET_CAPTURE)) {
            return false;
        }
        $offset = $match[0][1];
        return true;
    }
}
