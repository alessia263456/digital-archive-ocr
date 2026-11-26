<?php

namespace App\Services;

use Illuminate\Support\Str;

final class PiiDetector
{
    /** @param list<array<string, mixed>> $words @return list<array{category:string, disposition:string, page:int, confidence:float, bounding_boxes:list<array{left:int,top:int,width:int,height:int}>}> */
    public function detect(array $words, int $page): array
    {
        $candidates = [];
        $ordered = array_values($words);

        foreach ($ordered as $index => $word) {
            $text = trim((string) ($word['text'] ?? ''));
            if ($text === '') {
                continue;
            }

            $this->detectIdentifiers($ordered, $index, $page, $candidates);
            $this->detectContactsAndLabels($ordered, $index, $page, $candidates);
        }

        $unique = [];
        foreach ($candidates as $candidate) {
            $key = $candidate['category'].'|'.json_encode($candidate['bounding_boxes'], JSON_THROW_ON_ERROR);
            if (!isset($unique[$key]) || $candidate['disposition'] === 'review') {
                $unique[$key] = $candidate;
            }
        }
        return array_values($unique);
    }

    private function detectIdentifiers(array $words, int $start, int $page, array &$candidates): void
    {
        $digitParts = [];
        $digitCount = 0;
        for ($end = $start; $end < min(count($words), $start + 13); $end++) {
            if ($end > $start && !$this->adjacent($words[$end - 1], $words[$end])) {
                break;
            }
            $part = (string) ($words[$end]['text'] ?? '');
            if (!preg_match('/^\d+$/', $part)) {
                break;
            }
            $digitParts[] = $words[$end];
            $digitCount += strlen($part);
        }
        $digitSequence = implode('', array_map(static fn (array $word): string => (string) $word['text'], $digitParts));
        $cnpAnchors = ['cnp', 'cod numeric personal', 'codul numeric personal'];
        $continuesDigitRun = $start > 0 && $this->adjacent($words[$start - 1], $words[$start])
            && preg_match('/^\d+$/', (string) ($words[$start - 1]['text'] ?? ''));
        if (!$continuesDigitRun && $digitCount >= 10
            && !($digitCount === 13 && $this->validCnp($digitSequence))
            && $this->anchor($words, $start, $cnpAnchors) !== null
            && $this->anchorCount($words, $start, $cnpAnchors) === 1
            && !$this->conflictingAnchor($words, $start, 'cnp')) {
            $this->add($candidates, 'cnp', 'review', $page, $digitParts);
        }

        $digits = '';
        $parts = [];
        for ($end = $start; $end < min(count($words), $start + 13); $end++) {
            if ($end > $start && !$this->adjacent($words[$end - 1], $words[$end])) {
                break;
            }
            $part = (string) ($words[$end]['text'] ?? '');
            if (!preg_match('/^\d+$/', $part) || strlen($digits) + strlen($part) > 13) {
                break;
            }
            $digits .= $part;
            $parts[] = $words[$end];
            if (strlen($digits) === 13) {
                $anchor = $this->anchor($words, $start, ['cnp', 'cod numeric personal', 'codul numeric personal']);
                $valid = $this->validCnp($digits);
                $this->add($candidates, 'cnp', $valid && $anchor !== null
                    && $this->anchorCount($words, $start, ['cnp', 'cod numeric personal', 'codul numeric personal']) === 1
                    && !$this->conflictingAnchor($words, $start, 'cnp')
                    && $this->score($parts) >= $this->cutoff() ? 'redact' : 'review', $page, $parts);
                break;
            }
        }

        $iban = '';
        $parts = [];
        for ($end = $start; $end < min(count($words), $start + 12); $end++) {
            if ($end > $start && !$this->adjacent($words[$end - 1], $words[$end])) {
                break;
            }
            $part = strtoupper((string) ($words[$end]['text'] ?? ''));
            if (!preg_match('/^[A-Z0-9]+$/', $part) || strlen($iban) + strlen($part) > 34) {
                break;
            }
            $iban .= $part;
            $parts[] = $words[$end];
            if (strlen($iban) >= 15 && preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/', $iban)) {
                $anchor = $this->anchor($words, $start, ['iban', 'cont iban', 'contul iban']);
                $valid = $this->validIban($iban);
                $this->add($candidates, 'iban', $valid && $anchor !== null
                    && $this->anchorCount($words, $start, ['iban', 'cont iban', 'contul iban']) === 1
                    && !$this->conflictingAnchor($words, $start, 'iban')
                    && $this->score($parts) >= $this->cutoff() ? 'redact' : 'review', $page, $parts);
                break;
            }
        }
    }

    private function detectContactsAndLabels(array $words, int $index, int $page, array &$candidates): void
    {
        $word = $words[$index];
        $text = (string) ($word['text'] ?? '');
        $normalized = $this->normalize($text);

        if (preg_match('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', $text)) {
            $this->add($candidates, 'email', 'review', $page, [$word]);
        }
        $phone = preg_replace('/[ .()\/-]+/', '', $text) ?? '';
        if (preg_match('/^(?:\+40|0040)\d{9}$|^0\d{9}$/', $phone)) {
            $this->add($candidates, 'phone', 'review', $page, [$word]);
        }

        $phoneLabel = in_array($normalized, ['telefon', 'tel', 'mobil', 'telefonul'], true);
        if ($phoneLabel && isset($words[$index + 1]) && $this->adjacent($word, $words[$index + 1])) {
            $next = $words[$index + 1];
            if (preg_match('/[+()\d][+()\d .\/-]{6,}/', (string) $next['text'])) {
                $this->add($candidates, 'phone', 'review', $page, [$next]);
            }
        }

        if (in_array($normalized, ['subsemnatul', 'subsemnata', 'numitul', 'numita', 'numele', 'prenumele', 'domnul', 'doamna'], true)
            && !$this->nearNotaryBefore($words, $index)) {
            $nameWords = $this->following($words, $index, 2);
            if ($nameWords !== []) {
                $this->add($candidates, 'signatory_name', 'review', $page, $nameWords);
            }
        }

        if ($this->phraseAt($words, $index, ['domiciliat in', 'domiciliata in', 'cu domiciliul in', 'domiciliul in'])) {
            $offset = $this->phraseLength($words, $index, ['domiciliat in', 'domiciliata in', 'cu domiciliul in', 'domiciliul in']);
            $this->addLabeledValue($words, $index + $offset, 'address', $page, $candidates, 7);
        }

        if ($this->phraseAt($words, $index, ['seria ci numar', 'carte de identitate', 'buletin de identitate', 'seria ci', 'seria c i'])) {
            $offset = $this->phraseLength($words, $index, ['seria ci numar', 'carte de identitate', 'buletin de identitate', 'seria ci', 'seria c i']);
            $this->addLabeledValue($words, $index + $offset, 'identity_card', $page, $candidates, 4);
        } elseif ($normalized === 'seria' && isset($words[$index + 1]) && preg_match('/^[A-Z]{1,3}$/', (string) $words[$index + 1]['text'])) {
            $this->addLabeledValue($words, $index + 1, 'identity_card', $page, $candidates, 3);
        }

        if ($this->phraseAt($words, $index, ['numar cadastral', 'nr cadastral', 'numarul cadastral', 'numar cf', 'nr cf'])) {
            $offset = $this->phraseLength($words, $index, ['numar cadastral', 'nr cadastral', 'numarul cadastral', 'numar cf', 'nr cf']);
            $this->addLabeledValue($words, $index + $offset, 'cadastral_identifier', $page, $candidates, 3);
        }

        if ($this->phraseAt($words, $index, ['numar de inmatriculare', 'numarul de inmatriculare', 'numar inmatriculare', 'nr de inmatriculare', 'serie sasiu', 'numar sasiu', 'vin'])) {
            $offset = $this->phraseLength($words, $index, ['numar de inmatriculare', 'numarul de inmatriculare', 'numar inmatriculare', 'nr de inmatriculare', 'serie sasiu', 'numar sasiu', 'vin']);
            $this->addLabeledValue($words, $index + $offset, 'vehicle_identifier', $page, $candidates, 4);
        }

        if (in_array($normalized, ['cui', 'cif'], true) || $this->phraseAt($words, $index, ['cod unic de inregistrare'])) {
            $offset = $normalized === 'cod' ? 4 : 1;
            $this->addLabeledValue($words, $index + $offset, 'cui_cif', $page, $candidates, 2);
        }

        if (in_array($normalized, ['semnatura', 'semnaturile', 'semnatura partii'], true)
            && !$this->nearNotary($words, $index)) {
            $this->add($candidates, 'signatory_signature', 'review', $page, [$word]);
        }
    }

    private function addLabeledValue(array $words, int $start, string $category, int $page, array &$candidates, int $limit): void
    {
        if (!isset($words[$start])) {
            return;
        }
        $selected = [];
        for ($index = $start; $index < min(count($words), $start + $limit); $index++) {
            if ($index > $start && !$this->sameLine($words[$index - 1], $words[$index])) {
                break;
            }
            $value = (string) ($words[$index]['text'] ?? '');
            if ($value === '' || preg_match('/^[,;:.]+$/u', $value)) {
                break;
            }
            $selected[] = $words[$index];
        }
        if ($selected !== []) {
            $this->add($candidates, $category, 'redact', $page, $selected);
        }
    }

    private function following(array $words, int $index, int $limit): array
    {
        $selected = [];
        for ($next = $index + 1; $next < min(count($words), $index + 1 + $limit); $next++) {
            if (!$this->sameLine($words[$next - 1], $words[$next])) {
                break;
            }
            $text = (string) ($words[$next]['text'] ?? '');
            if (preg_match('/^[,;:.]+$/u', $text)) {
                break;
            }
            $selected[] = $words[$next];
        }
        return $selected;
    }

    private function anchor(array $words, int $identifier, array $phrases): ?int
    {
        for ($index = 0; $index < $identifier; $index++) {
            if (!$this->withinAnchorDistance($words, $index, $identifier)) {
                continue;
            }
            foreach ($phrases as $phrase) {
                if ($this->phraseAt($words, $index, [$phrase])) {
                    return $index;
                }
            }
        }
        return null;
    }

    private function conflictingAnchor(array $words, int $identifier, string $type): bool
    {
        $other = $type === 'cnp'
            ? ['iban', 'cont iban', 'contul iban']
            : ['cnp', 'cod numeric personal', 'codul numeric personal'];
        foreach ($other as $phrase) {
            for ($index = 0; $index < $identifier; $index++) {
                if ($this->withinAnchorDistance($words, $index, $identifier) && $this->phraseAt($words, $index, [$phrase])) {
                    return true;
                }
            }
        }
        return false;
    }

    private function anchorCount(array $words, int $identifier, array $phrases): int
    {
        $count = 0;
        for ($index = 0; $index < $identifier; $index++) {
            if ($this->withinAnchorDistance($words, $index, $identifier)) {
                foreach ($phrases as $phrase) {
                    if ($this->phraseAt($words, $index, [$phrase])) {
                        $count++;
                        break;
                    }
                }
            }
        }
        return $count;
    }

    private function withinAnchorDistance(array $words, int $anchor, int $identifier): bool
    {
        if (!$this->sameBlock($words[$anchor], $words[$identifier])) {
            return false;
        }
        $lineDelta = (int) ($words[$identifier]['line_num'] ?? 1) - (int) ($words[$anchor]['line_num'] ?? 1);
        $intervening = max(0, $identifier - $anchor - 1);
        if ($lineDelta === 0) {
            return $intervening <= (int) config('services.ocr.pii_anchor_same_line_words', 3);
        }
        return $lineDelta === 1 && $intervening <= (int) config('services.ocr.pii_anchor_next_line_words', 5);
    }

    private function phraseAt(array $words, int $index, array $phrases): bool
    {
        foreach ($phrases as $phrase) {
            $parts = explode(' ', $phrase);
            $actual = [];
            for ($offset = 0; $offset < count($parts); $offset++) {
                if (!isset($words[$index + $offset]) || ($offset > 0 && !$this->adjacent($words[$index + $offset - 1], $words[$index + $offset]))) {
                    continue 2;
                }
                $actual[] = $this->normalize((string) ($words[$index + $offset]['text'] ?? ''));
            }
            if (implode(' ', $actual) === $phrase) {
                return true;
            }
        }
        return false;
    }

    private function phraseLength(array $words, int $index, array $phrases): int
    {
        foreach ($phrases as $phrase) {
            if ($this->phraseAt($words, $index, [$phrase])) {
                return count(explode(' ', $phrase));
            }
        }
        return 1;
    }

    private function nearNotary(array $words, int $index): bool
    {
        if ($this->nearNotaryBefore($words, $index)) {
            return true;
        }
        for ($start = $index + 1; $start <= min(count($words) - 1, $index + 1); $start++) {
            if ($this->sameLine($words[$start], $words[$index])
                && $this->phraseAt($words, $start, ['notarului public'])) {
                return true;
            }
        }
        return false;
    }

    private function nearNotaryBefore(array $words, int $index): bool
    {
        for ($start = max(0, $index - 4); $start < $index; $start++) {
            if ($this->sameLine($words[$start], $words[$index])
                && $this->phraseAt($words, $start, ['notar public', 'notarul public', 'notarului public'])) {
                return true;
            }
        }
        return false;
    }

    private function adjacent(array $left, array $right): bool
    {
        return $this->sameLine($left, $right)
            && (int) ($right['word_num'] ?? 0) === (int) ($left['word_num'] ?? -2) + 1;
    }

    private function sameLine(array $left, array $right): bool
    {
        return $this->sameBlock($left, $right)
            && (int) ($left['line_num'] ?? 1) === (int) ($right['line_num'] ?? 1);
    }

    private function sameBlock(array $left, array $right): bool
    {
        return (int) ($left['block_num'] ?? 1) === (int) ($right['block_num'] ?? 1);
    }

    private function validCnp(string $value): bool
    {
        if (strlen($value) !== 13 || !ctype_digit($value)) {
            return false;
        }
        $sum = 0;
        foreach (str_split('279146358279') as $index => $weight) {
            $sum += (int) $value[$index] * (int) $weight;
        }
        $control = $sum % 11;
        return ($control === 10 ? 1 : $control) === (int) $value[12];
    }

    private function validIban(string $value): bool
    {
        if (strlen($value) < 15 || strlen($value) > 34 || !preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]+$/', $value)) {
            return false;
        }
        $rearranged = substr($value, 4).substr($value, 0, 4);
        $remainder = 0;
        foreach (str_split($rearranged) as $character) {
            $digits = ctype_alpha($character) ? (string) (ord($character) - 55) : $character;
            foreach (str_split($digits) as $digit) {
                $remainder = ($remainder * 10 + (int) $digit) % 97;
            }
        }
        return $remainder === 1;
    }

    private function score(array $words): float
    {
        return min(array_map(static fn (array $word): float => (float) ($word['confidence'] ?? 0), $words));
    }

    private function cutoff(): float
    {
        return (float) config('services.ocr.pii_confidence_cutoff', 80);
    }

    private function normalize(string $value): string
    {
        $value = Str::ascii(mb_strtolower($value));
        return trim(preg_replace('/[^a-z0-9]+/', ' ', $value) ?? '');
    }

    private function add(array &$candidates, string $category, string $disposition, int $page, array $words): void
    {
        $boxes = [];
        foreach ($words as $word) {
            if (isset($word['left'], $word['top'], $word['width'], $word['height'])) {
                $boxes[] = [
                    'left' => (int) $word['left'],
                    'top' => (int) $word['top'],
                    'width' => (int) $word['width'],
                    'height' => (int) $word['height'],
                ];
            }
        }
        if ($boxes === []) {
            return;
        }
        $candidates[] = [
            'category' => $category,
            'disposition' => $disposition,
            'page' => $page,
            'confidence' => $this->score($words),
            'bounding_boxes' => $boxes,
        ];
    }
}
