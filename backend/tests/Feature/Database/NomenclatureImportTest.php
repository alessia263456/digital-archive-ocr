<?php

namespace Tests\Feature\Database;

use App\Models\NomenclatureEntry;
use Database\Seeders\NomenclatureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NomenclatureImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_imports_all_rules_and_preserves_source_values(): void
    {
        $this->seed(NomenclatureSeeder::class);

        self::assertSame(49, NomenclatureEntry::count());
        self::assertSame(49, NomenclatureEntry::query()->get()->map(
            static fn (NomenclatureEntry $entry) => implode("\\0", [
                $entry->document_type,
                $entry->subtype,
                $entry->storage_context,
            ])
        )->unique()->count());
        self::assertSame(49, DB::table('nomenclature_entries')->count());
        self::assertSame(49, NomenclatureEntry::query()->whereNotNull('source_rule')->count());
        self::assertSame(49, NomenclatureEntry::query()->whereNotNull('retention_computation_base')->count());
        self::assertSame(49, NomenclatureEntry::query()->whereNotNull('retention_term')->count());
        self::assertSame(49, NomenclatureEntry::query()->whereNotNull('archival_indicator')->count());

        $permanent = NomenclatureEntry::query()->where('retention_term', 'P')->firstOrFail();
        self::assertNull($permanent->retention_years);
        self::assertFalse($permanent->cs_flag);
        self::assertSame('Nu se aplică (Permanent)', $permanent->retention_computation_base);

        self::assertGreaterThan(1, NomenclatureEntry::query()->where('archival_indicator', 'IA 1')->count());
        self::assertSame(6, NomenclatureEntry::query()->distinct()->count('retention_computation_base'));
        self::assertSame(49, NomenclatureEntry::query()->where('cs_flag', true)->count() + NomenclatureEntry::query()->where('cs_flag', false)->count());
    }

    public function test_identical_import_preserves_row_ids(): void
    {
        $this->seed(NomenclatureSeeder::class);
        $before = NomenclatureEntry::query()->orderBy('id')->pluck('id')->all();

        $this->seed(NomenclatureSeeder::class);

        self::assertSame($before, NomenclatureEntry::query()->orderBy('id')->pluck('id')->all());
        self::assertSame(49, NomenclatureEntry::count());
    }

    public function test_invalid_source_row_rolls_back_and_reports_its_line(): void
    {
        $source = tempnam(sys_get_temp_dir(), 'nomenclature-');
        $rows = file(base_path('database/seeders/data/nomenclator_arhivistic.csv'));
        $rows[1] = "invalid,row\n";
        file_put_contents($source, implode('', $rows));

        try {
            app(NomenclatureSeeder::class)->import($source);
            self::fail('Importul trebuia să respingă rândul invalid.');
        } catch (\InvalidArgumentException $exception) {
            self::assertStringContainsString('rândul 2', $exception->getMessage());
        } finally {
            @unlink($source);
        }

        self::assertSame(0, NomenclatureEntry::count());
    }

    public function test_duplicate_classification_is_rejected_with_source_line_and_rollback(): void
    {
        $source = tempnam(sys_get_temp_dir(), 'nomenclature-');
        $input = fopen(base_path('database/seeders/data/nomenclator_arhivistic.csv'), 'rb');
        $output = fopen($source, 'wb');
        $first = fgetcsv($input);
        fputcsv($output, $first);
        $duplicate = null;
        while (($row = fgetcsv($input)) !== false) {
            fputcsv($output, $row);
            $duplicate ??= $row;
        }
        fputcsv($output, $duplicate);
        fclose($input);
        fclose($output);

        try {
            app(NomenclatureSeeder::class)->import($source);
            self::fail('Importul trebuia să respingă clasificarea duplicată.');
        } catch (\InvalidArgumentException $exception) {
            self::assertStringContainsString('rândul 51', $exception->getMessage());
        } finally {
            @unlink($source);
        }

        self::assertSame(0, NomenclatureEntry::count());
    }
}
