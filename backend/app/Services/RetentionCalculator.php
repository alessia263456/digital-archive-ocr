<?php

namespace App\Services;

use App\Models\NomenclatureEntry;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

final class RetentionCalculator
{
    private const PERMANENT = 'Nu se aplică (Permanent)';
    private const BASES = [
        'De la 1 ianuarie al anului următor întocmirii/încheierii actului' => ['act_date', true],
        'De la 1 ianuarie al anului următor depunerii' => ['deposit_date', true],
        'De la 1 ianuarie al anului următor soluționării dosarului' => ['dossier_resolution_date', true],
        'De la împlinirea termenului prevăzut în contract' => ['contract_expiry', false],
        'De la termenul de eliberare a depozitului' => ['deposit_release_date', false],
    ];

    /** @return array{status: 'permanent'|'pending'|'calculated', computation_base: string, base_date: ?string, first_eligible_date: ?string, retention_years: ?int} */
    public function calculate(NomenclatureEntry $entry, array $metadata): array
    {
        $base = $entry->retention_computation_base;
        $years = $entry->retention_years;

        if ($base === self::PERMANENT || $entry->retention_term === 'P') {
            return ['status' => 'permanent', 'computation_base' => $base, 'base_date' => null, 'first_eligible_date' => null, 'retention_years' => null];
        }
        if (!is_int($years) || $years < 0 || !isset(self::BASES[$base])) {
            throw new InvalidArgumentException('Regula de păstrare nu are o bază sau un termen valid.');
        }

        [$field, $nextYearStart] = self::BASES[$base];
        $value = $metadata[$field] ?? null;
        if (!is_string($value) || $value === '') {
            return ['status' => 'pending', 'computation_base' => $base, 'base_date' => null, 'first_eligible_date' => null, 'retention_years' => $years];
        }

        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $value);
            if ($date === false || $date->format('Y-m-d') !== $value) {
                throw new InvalidArgumentException();
            }
        } catch (\Throwable) {
            throw new InvalidArgumentException('Data bazei de calcul trebuie să fie o dată calendaristică validă.');
        }

        if ($nextYearStart) {
            $date = CarbonImmutable::create($date->year + 1, 1, 1);
        }
        $eligible = $this->addCalendarYears($date, $years);

        return [
            'status' => 'calculated',
            'computation_base' => $base,
            'base_date' => $date->toDateString(),
            'first_eligible_date' => $eligible->toDateString(),
            'retention_years' => $years,
        ];
    }

    private function addCalendarYears(CarbonImmutable $date, int $years): CarbonImmutable
    {
        $targetYear = $date->year + $years;
        $day = min($date->day, CarbonImmutable::create($targetYear, $date->month, 1)->daysInMonth);
        return CarbonImmutable::create($targetYear, $date->month, $day);
    }
}
