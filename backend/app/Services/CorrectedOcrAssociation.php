<?php

namespace App\Services;

final class CorrectedOcrAssociation
{
    public function map(string $sourceText, array $sourceWords, string $baseText, array $operations): array
    {
        $text = $baseText;
        $owners = $this->sourceOwners($sourceText, $sourceWords, $baseText);
        foreach ($operations as $operation) {
            if (!is_array($operation) || !is_int($operation['start'] ?? null)
                || !is_string($operation['deleted'] ?? null) || !is_string($operation['inserted'] ?? null)) {
                throw new \InvalidArgumentException('Operația de corectare nu este validă.');
            }
            $start = $this->byteOffset($text, $operation['start']);
            $deleted = $operation['deleted'];
            if (substr($text, $start, strlen($deleted)) !== $deleted) {
                throw new \InvalidArgumentException('Operația de corectare nu corespunde textului.');
            }
            $end = $start + strlen($deleted);
            $this->byteOffset($text, $operation['start'] + $this->utf16Length($deleted));
            $removed = [];
            for ($i = $start; $i < $end; $i++) foreach ($owners[$i] ?? [] as $index) $removed[$index] = true;
            $owner = array_keys($removed);
            sort($owner);
            if ($owner === []) {
                $left = $owners[$start - 1] ?? [];
                $right = $owners[$start] ?? [];
                if ($left !== [] && $left === $right) $owner = $left;
                elseif (!preg_match('/\s/u', $operation['inserted'])) $owner = $left !== [] ? $left : $right;
            }
            $text = substr_replace($text, $operation['inserted'], $start, strlen($deleted));
            array_splice($owners, $start, strlen($deleted), array_fill(0, strlen($operation['inserted']), $owner));
        }
        if (!mb_check_encoding($text, 'UTF-8')) throw new \InvalidArgumentException('Textul corectat nu este UTF-8 valid.');
        preg_match_all('/\S+/u', $text, $matches, PREG_OFFSET_CAPTURE);
        $mapping = [];
        foreach ($matches[0] as $index => [$token, $start]) {
            $indexes = [];
            $unknown = false;
            for ($i = $start; $i < $start + strlen($token); $i++) {
                if (($owners[$i] ?? []) === []) $unknown = true;
                foreach ($owners[$i] ?? [] as $sourceIndex) $indexes[$sourceIndex] = true;
            }
            $sourceIndexes = array_keys($indexes);
            sort($sourceIndexes);
            $mapping[$index] = !$unknown && $sourceIndexes !== []
                && $sourceIndexes === range(min($sourceIndexes), max($sourceIndexes)) ? $sourceIndexes : [];
        }
        return ['text' => $text, 'mapping' => $mapping];
    }

    private function sourceOwners(string $sourceText, array $sourceWords, string $baseText): array
    {
        $owners = array_fill(0, strlen($sourceText), []);
        preg_match_all('/\S+/u', $sourceText, $matches, PREG_OFFSET_CAPTURE);
        foreach ($matches[0] as $index => [$token, $start]) {
            if ($token !== ($sourceWords[$index]['text'] ?? null)) continue;
            for ($i = $start; $i < $start + strlen($token); $i++) $owners[$i] = [$index];
        }
        if ($baseText === $sourceText) return $owners;
        preg_match_all('/\S+/u', $baseText, $baseMatches, PREG_OFFSET_CAPTURE);
        $sourceTokens = $matches[0];
        $baseTokens = $baseMatches[0];
        $prefix = 0;
        while (isset($sourceTokens[$prefix], $baseTokens[$prefix])
            && $sourceTokens[$prefix][0] === $baseTokens[$prefix][0]) $prefix++;
        $suffix = 0;
        while ($suffix < count($sourceTokens) - $prefix && $suffix < count($baseTokens) - $prefix
            && $sourceTokens[count($sourceTokens) - 1 - $suffix][0] === $baseTokens[count($baseTokens) - 1 - $suffix][0]) $suffix++;
        $legacy = array_fill(0, strlen($baseText), []);
        foreach ($baseTokens as $index => [$token, $start]) {
            $sourceIndex = $index < $prefix ? $index
                : ($index >= count($baseTokens) - $suffix ? count($sourceTokens) - count($baseTokens) + $index : null);
            if ($sourceIndex === null || $token !== ($sourceWords[$sourceIndex]['text'] ?? null)) continue;
            for ($i = $start; $i < $start + strlen($token); $i++) $legacy[$i] = [$sourceIndex];
        }
        return $legacy;
    }

    private function utf16Length(string $text): int
    {
        return intdiv(strlen(mb_convert_encoding($text, 'UTF-16LE', 'UTF-8')), 2);
    }

    private function byteOffset(string $text, int $units): int
    {
        if ($units < 0) throw new \InvalidArgumentException('Poziția corecturii nu este validă.');
        $bytes = 0;
        $count = 0;
        foreach (preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $character) {
            if ($count === $units) return $bytes;
            $count += $this->utf16Length($character);
            $bytes += strlen($character);
            if ($count > $units) throw new \InvalidArgumentException('Poziția corecturii împarte un caracter.');
        }
        if ($count === $units) return $bytes;
        throw new \InvalidArgumentException('Poziția corecturii depășește textul.');
    }
}
