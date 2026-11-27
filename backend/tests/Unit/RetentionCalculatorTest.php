<?php

namespace Tests\Unit;

use App\Models\NomenclatureEntry;
use App\Services\RetentionCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class RetentionCalculatorTest extends TestCase
{
    private const PERMANENT = 'Nu se aplică (Permanent)';

    public function test_computes_each_of_the_five_dated_bases_and_leaves_unknown_dates_pending(): void
    {
        $calculator = new RetentionCalculator();
        $cases = [
            ['De la 1 ianuarie al anului următor întocmirii/încheierii actului', 'act_date', '2026-06-15', '2027-01-01', '2032-01-01'],
            ['De la 1 ianuarie al anului următor depunerii', 'deposit_date', '2025-12-31', '2026-01-01', '2031-01-01'],
            ['De la 1 ianuarie al anului următor soluționării dosarului', 'dossier_resolution_date', '2024-02-29', '2025-01-01', '2030-01-01'],
            ['De la împlinirea termenului prevăzut în contract', 'contract_expiry', '2026-02-28', '2026-02-28', '2031-02-28'],
            ['De la termenul de eliberare a depozitului', 'deposit_release_date', '2026-07-01', '2026-07-01', '2031-07-01'],
        ];

        foreach ($cases as [$base, $field, $value, $baseDate, $eligible]) {
            $entry = $this->entry($base, 5);
            self::assertSame([
                'status' => 'calculated', 'computation_base' => $base, 'base_date' => $baseDate,
                'first_eligible_date' => $eligible, 'retention_years' => 5,
            ], $calculator->calculate($entry, [$field => $value]));
            self::assertSame('pending', $calculator->calculate($entry, [])['status']);
        }
    }

    public function test_clamps_february_29_to_february_28_when_target_year_is_not_leap(): void
    {
        $result = (new RetentionCalculator())->calculate(
            $this->entry('De la împlinirea termenului prevăzut în contract', 5),
            ['contract_expiry' => '2020-02-29'],
        );

        self::assertSame('2025-02-28', $result['first_eligible_date']);
    }

    public function test_preserves_february_29_when_target_year_is_leap(): void
    {
        $result = (new RetentionCalculator())->calculate(
            $this->entry('De la împlinirea termenului prevăzut în contract', 4),
            ['contract_expiry' => '2020-02-29'],
        );

        self::assertSame('2024-02-29', $result['first_eligible_date']);
    }

    public function test_permanent_retention_has_no_eligibility_date(): void
    {
        $result = (new RetentionCalculator())->calculate($this->entry(self::PERMANENT, null, 'P'), []);

        self::assertSame('permanent', $result['status']);
        self::assertNull($result['first_eligible_date']);
    }

    public function test_rejects_an_invalid_calendar_date(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new RetentionCalculator())->calculate(
            $this->entry('De la împlinirea termenului prevăzut în contract', 5),
            ['contract_expiry' => '2025-02-29'],
        );
    }

    private function entry(string $base, ?int $years, ?string $term = null): NomenclatureEntry
    {
        $entry = new NomenclatureEntry();
        $entry->retention_computation_base = $base;
        $entry->retention_years = $years;
        $entry->retention_term = $term ?? $years.' ani';
        return $entry;
    }
}
