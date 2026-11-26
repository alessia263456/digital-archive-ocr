<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\NomenclatureEntry;
use App\Models\User;
use Database\Seeders\NomenclatureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class MetadataSuggestionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(NomenclatureSeeder::class);
    }

    public function test_staff_gets_persisted_candidates_and_classification_options(): void
    {
        $draft = $this->readyDraft('Data actului: 15.03.2024. Actul a fost autentificat sub nr. 87. Suma de 125 lei. Contract de comodat.');

        $response = $this->asRole('arhivar')->getJson('/api/drafts/'.$draft->id.'/metadata')->assertOk();

        $response->assertJsonPath('suggestions.0.field', 'act_date')
            ->assertJsonPath('suggestions.0.value', '2024-03-15')
            ->assertJsonPath('suggestions.1.field', 'act_number')
            ->assertJsonPath('suggestions.2.field', 'amount')
            ->assertJsonPath('suggestions.3.field', 'tags')
            ->assertJsonPath('metadata_confirmed', false)
            ->assertJsonFragment(['id' => NomenclatureEntry::query()->firstOrFail()->id]);

        $this->assertDatabaseHas('document_drafts', ['id' => $draft->id]);
        self::assertNotNull($draft->fresh()->metadata_suggestions);
        self::assertNull($draft->fresh()->metadata);
    }

    public function test_staff_edits_remain_separate_and_unconfirmed_until_required_fields_are_confirmed(): void
    {
        $draft = $this->readyDraft('Data actului: 15.03.2024. Suma de 125 lei.');
        $classification = NomenclatureEntry::query()->where('document_type', 'Contract')->firstOrFail();
        $this->asRole('admin')->getJson('/api/drafts/'.$draft->id.'/metadata')->assertOk();

        $this->patchJson('/api/drafts/'.$draft->id.'/metadata', [
            'metadata' => [
                'act_date' => '2024-03-16',
                'act_number' => '88',
                'physical_dossier_number' => '29/2024',
                'inventory_number' => '29/2024',
                'amount' => '130 lei',
                'tags' => ['Contract'],
            ],
            'nomenclature_entry_id' => $classification->id,
        ])->assertOk()
            ->assertJsonPath('metadata.act_date', '2024-03-16')
            ->assertJsonPath('metadata_confirmed', false)
            ->assertJsonPath('classification.archival_indicator', $classification->archival_indicator);

        $saved = $draft->fresh();
        self::assertSame('2024-03-16', $saved->metadata['act_date']);
        self::assertSame('2024-03-15', $saved->metadata_suggestions[0]['value']);
        self::assertNull($saved->metadata_confirmed_at);

        $this->postJson('/api/drafts/'.$draft->id.'/metadata/confirm')->assertOk()
            ->assertJsonPath('metadata_confirmed', true);
        self::assertNotNull($draft->fresh()->metadata_confirmed_at);
    }

    public function test_invalid_classification_and_missing_required_metadata_are_rejected(): void
    {
        $draft = $this->readyDraft('Act autentificat sub nr. 33.');
        $this->asRole('admin');

        $this->patchJson('/api/drafts/'.$draft->id.'/metadata', [
            'metadata' => ['act_number' => '33'],
            'nomenclature_entry_id' => 999999,
        ])->assertUnprocessable();
        self::assertNull($draft->fresh()->metadata);

        $entry = NomenclatureEntry::query()->firstOrFail();
        $this->patchJson('/api/drafts/'.$draft->id.'/metadata', [
            'metadata' => ['act_number' => '33'],
            'nomenclature_entry_id' => $entry->id,
        ])->assertOk();
        $this->postJson('/api/drafts/'.$draft->id.'/metadata/confirm')->assertUnprocessable()
            ->assertJsonPath('eroare', 'Completați data actului, numărul actului, numărul dosarului fizic și numărul de inventar înainte de confirmare.');
    }

    public function test_only_admin_and_arhivar_can_read_or_change_draft_metadata(): void
    {
        $draft = $this->readyDraft('Contract de comodat.');
        $this->asRole('cititor')->getJson('/api/drafts/'.$draft->id.'/metadata')->assertForbidden();
        $this->patchJson('/api/drafts/'.$draft->id.'/metadata', ['metadata' => []])->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/drafts/'.$draft->id.'/metadata')->assertUnauthorized();
        self::assertNull($draft->fresh()->metadata_suggestions);
    }

    private function readyDraft(string $text): DocumentDraft
    {
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(),
            'source_format' => 'pdf',
            'original_storage_keys' => ['drafts/metadata.pdf'],
            'status' => 'review_ready',
            'ocr_extraction_id' => (string) Str::uuid(),
        ]);
        DB::table('ocr_pages')->insert([
            'extraction' => $draft->ocr_extraction_id,
            'source_sha256' => str_repeat('a', 64),
            'page' => 1,
            'width' => 100,
            'height' => 200,
            'text' => $text,
            'tsv' => '',
            'words' => '[]',
        ]);
        return $draft;
    }

    private function asRole(string $role): self
    {
        $user = User::query()->create([
            'name' => 'Metadata User',
            'email' => 'metadata-'.bin2hex(random_bytes(5)).'@example.test',
            'username' => 'metadata_'.bin2hex(random_bytes(5)),
            'password' => 'test-password',
            'role' => $role,
        ]);
        $this->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
        $this->actingAs($user, 'web');
        return $this;
    }
}
