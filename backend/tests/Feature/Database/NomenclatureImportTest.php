<?php

namespace Tests\Feature\Database;

use App\Models\NomenclatureEntry;
use Database\Seeders\NomenclatureSeeder;
use Database\Seeders\DatabaseSeeder;
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
        $source = fopen(base_path('database/seeders/data/nomenclator_arhivistic.csv'), 'rb');
        fgetcsv($source);
        while (($row = fgetcsv($source)) !== false) {
            [$type, $subtype, $context, $indicator, $term, $base, $rule] = array_map('trim', $row);
            $entry = NomenclatureEntry::query()
                ->where('document_type', $type)
                ->where('subtype', $subtype)
                ->where('storage_context', $context)
                ->firstOrFail();
            $years = $term === 'P' ? null : (int) $term;
            self::assertSame($indicator, $entry->archival_indicator);
            self::assertSame($term, $entry->retention_term);
            self::assertSame($years, $entry->retention_years);
            self::assertSame(str_ends_with($term, 'C.S.'), $entry->cs_flag);
            self::assertSame($base, $entry->retention_computation_base);
            self::assertSame($rule, $entry->source_rule);
        }
        fclose($source);

        $permanent = NomenclatureEntry::query()->where('retention_term', 'P')->firstOrFail();
        self::assertNull($permanent->retention_years);
        self::assertFalse($permanent->cs_flag);
        self::assertSame('Nu se aplică (Permanent)', $permanent->retention_computation_base);

        self::assertGreaterThan(1, NomenclatureEntry::query()->where('archival_indicator', 'IA 1')->count());
        self::assertSame(6, NomenclatureEntry::query()->distinct()->count('retention_computation_base'));
    }

    public function test_identical_import_preserves_row_ids(): void
    {
        $this->seed(NomenclatureSeeder::class);
        $before = NomenclatureEntry::query()->orderBy('id')->pluck('id')->all();

        $this->seed(NomenclatureSeeder::class);

        self::assertSame($before, NomenclatureEntry::query()->orderBy('id')->pluck('id')->all());
        self::assertSame(49, NomenclatureEntry::count());
    }

    public function test_database_seeder_loads_the_initial_nomenclature(): void
    {
        $this->seed(DatabaseSeeder::class);

        self::assertSame(49, NomenclatureEntry::count());
    }

    public function test_conflicting_existing_rule_is_rejected_without_partial_import(): void
    {
        $this->seed(NomenclatureSeeder::class);
        $first = NomenclatureEntry::query()->firstOrFail();
        DB::table('nomenclature_entries')->where('id', $first->id)->update(['source_rule' => 'Regulă incompatibilă']);

        try {
            app(NomenclatureSeeder::class)->import(base_path('database/seeders/data/nomenclator_arhivistic.csv'));
            self::fail('Importul trebuia să respingă regula existentă incompatibilă.');
        } catch (\InvalidArgumentException $exception) {
            self::assertStringContainsString('rândul 2', $exception->getMessage());
        }

        self::assertSame(49, NomenclatureEntry::count());
        self::assertSame('Regulă incompatibilă', $first->fresh()->source_rule);
    }

    public function test_invalid_source_row_rolls_back_and_reports_its_line(): void
    {
        NomenclatureEntry::query()->delete();
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
        NomenclatureEntry::query()->delete();
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
