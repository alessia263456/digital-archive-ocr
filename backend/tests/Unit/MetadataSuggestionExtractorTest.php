<?php

namespace Tests\Unit;

use App\Services\MetadataSuggestionExtractor;
use Database\Seeders\NomenclatureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class MetadataSuggestionExtractorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(NomenclatureSeeder::class);
    }

    public function test_extracts_values_from_common_romanian_notarial_phrases(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 2,
            'text' => 'Încheiat astăzi, 15 martie 2024. Actul a fost autentificat sub nr. 87/2024. Suma de 125.000 lei.',
        ]]);

        self::assertSame([
            ['field' => 'act_date', 'value' => '2024-03-15', 'source' => 'Încheiat astăzi, 15 martie 2024', 'page' => 2],
            ['field' => 'act_number', 'value' => '87/2024', 'source' => 'Actul a fost autentificat sub nr. 87/2024', 'page' => 2],
            ['field' => 'amount', 'value' => '125.000 lei', 'source' => 'Suma de 125.000 lei', 'page' => 2],
        ], $suggestions);
    }

    public function test_does_not_treat_birth_dates_or_unlabeled_numbers_as_act_metadata(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 1,
            'text' => 'Semnatarul s-a născut la data de 12.05.1980. Identificat cu CI seria XX nr 123456. 2024 5000 77.',
        ]]);

        self::assertSame([], $suggestions);
    }

    public function test_extracts_contract_expiry_dossier_and_inventory_numbers_from_their_labels(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 1,
            'text' => 'Data expirării contractului: 20.11.2031. Dosar fizic nr. 29/2014. Numărul de inventar: 7/2014.',
        ]]);

        self::assertSame([
            ['field' => 'contract_expiry', 'value' => '2031-11-20', 'source' => 'Data expirării contractului: 20.11.2031', 'page' => 1],
            ['field' => 'physical_dossier_number', 'value' => '29/2014', 'source' => 'Dosar fizic nr. 29/2014', 'page' => 1],
            ['field' => 'inventory_number', 'value' => '7/2014', 'source' => 'Numărul de inventar: 7/2014', 'page' => 1],
        ], $suggestions);
    }

    public function test_handles_missing_diacritics_and_line_breaks_but_omits_uncertain_ocr_numbers(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 3,
            'text' => "Data autentificarii:\n5 iunie 2024. Act autentificat sub nr. lO3. Suma de 2.500,00 lei.",
        ]]);

        self::assertSame([
            ['field' => 'act_date', 'value' => '2024-06-05', 'source' => "Data autentificarii:\n5 iunie 2024", 'page' => 3],
            ['field' => 'amount', 'value' => '2.500,00 lei', 'source' => 'Suma de 2.500,00 lei', 'page' => 3],
        ], $suggestions);
    }

    public function test_does_not_duplicate_the_same_candidate_from_overlapping_labels(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 1,
            'text' => 'Data actului: 10.02.2025. Actul autentificat sub nr. 19.',
        ]]);

        self::assertCount(2, $suggestions);
        self::assertSame(['act_date', 'act_number'], array_column($suggestions, 'field'));
    }

    public function test_suggests_only_controlled_nomenclature_tags(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 1,
            'text' => 'Contract de comodat autentificat. Persoana a scris cuvântul portocală.',
        ]]);

        self::assertSame([
            ['field' => 'tags', 'value' => 'Contract', 'source' => 'Tip recunoscut în nomenclator: Contract', 'page' => 1],
        ], $suggestions);
    }

    public function test_omits_a_subtype_keyword_shared_by_multiple_document_types(): void
    {
        $suggestions = app(MetadataSuggestionExtractor::class)->extract([[
            'page' => 1,
            'text' => 'Comodat.',
        ]]);

        self::assertSame([], $suggestions);
    }
}
