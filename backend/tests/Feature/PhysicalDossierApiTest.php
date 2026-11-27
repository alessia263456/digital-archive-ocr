<?php

namespace Tests\Feature;

use App\Models\PhysicalDossier;
use App\Models\User;
use App\Models\NomenclatureEntry;
use Database\Seeders\NomenclatureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class PhysicalDossierApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(NomenclatureSeeder::class);
        $this->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
    }

    public function test_admin_creates_complete_dossier_and_staff_can_list_it(): void
    {
        $this->asRole('admin');
        $response = $this->postJson('/api/physical-dossiers', [
            'physical_dossier_number' => ' 29/2026 ',
            'nomenclature_entry_id' => $entry = NomenclatureEntry::query()->where('document_type', 'Contract')->firstOrFail()->id,
            'inventory_number' => 'INV-29/2026',
            'archival_indicator' => 'TAMPERED',
            'retention_time' => 'P',
            'description' => 'Contracte de comodat',
        ])->assertCreated()->assertJsonPath('dossier.physical_dossier_number', '29/2026')
            ->assertJsonPath('dossier.archival_indicator', NomenclatureEntry::query()->findOrFail($entry)->archival_indicator)
            ->assertJsonPath('dossier.inventory_number', 'INV-29/2026')
            ->assertJsonPath('dossier.retention_time', NomenclatureEntry::query()->findOrFail($entry)->retention_term)
            ->assertJsonPath('dossier.description', 'Contracte de comodat');

        $id = $response->json('dossier.id');
        $this->asRole('arhivar');
        $this->getJson('/api/physical-dossiers?nomenclature_entry_id='.$entry)->assertOk()
            ->assertJsonPath('dossiers.0.id', $id)
            ->assertJsonPath('dossiers.0.physical_dossier_number', '29/2026');
        $different = NomenclatureEntry::query()->where('retention_term', 'P')->firstOrFail();
        $this->getJson('/api/physical-dossiers?nomenclature_entry_id='.$different->id)->assertOk()
            ->assertJsonCount(0, 'dossiers');
    }

    public function test_dossier_numbers_are_unique_and_admin_or_archivar_can_create(): void
    {
        $this->asRole('admin');
        $entry = NomenclatureEntry::query()->firstOrFail();
        PhysicalDossier::query()->create([
            'physical_dossier_number' => '29/2026', 'archival_indicator' => $entry->archival_indicator,
            'inventory_number' => 'INV-29/2026', 'retention_time' => $entry->retention_term,
        ]);
        $this->postJson('/api/physical-dossiers', [
            'nomenclature_entry_id' => $entry->id, 'physical_dossier_number' => '29/2026',
            'inventory_number' => 'INV-29/2026',
        ])->assertUnprocessable()->assertJsonPath('cod', 'duplicate_dossier_number');

        $this->asRole('arhivar');
        $this->postJson('/api/physical-dossiers', [
            'nomenclature_entry_id' => $entry->id,
            'physical_dossier_number' => '30/2026',
            'inventory_number' => 'INV-30/2026',
        ])->assertCreated()
            ->assertJsonPath('dossier.physical_dossier_number', '30/2026')
            ->assertJsonPath('dossier.archival_indicator', $entry->archival_indicator)
            ->assertJsonPath('dossier.retention_time', $entry->retention_term);

        $this->asRole('cititor');
        $this->postJson('/api/physical-dossiers', [])->assertForbidden();
    }

    public function test_dossier_indicator_and_retention_are_derived_from_classification(): void
    {
        $this->asRole('admin');
        $entry = NomenclatureEntry::query()->firstOrFail();
        $this->postJson('/api/physical-dossiers', [
            'physical_dossier_number' => '30/2026',
        ])->assertUnprocessable()->assertJsonPath('cod', 'invalid_dossier');
        $this->postJson('/api/physical-dossiers', [
            'nomenclature_entry_id' => $entry->id, 'physical_dossier_number' => '30/2026',
            'inventory_number' => 'INV-30/2026',
        ])->assertCreated()->assertJsonPath('dossier.description', null)
            ->assertJsonPath('dossier.archival_indicator', $entry->archival_indicator)
            ->assertJsonPath('dossier.retention_time', $entry->retention_term);
    }

    private function asRole(string $role): void
    {
        $user = User::query()->create([
            'name' => 'Dossier User', 'email' => 'dossier-'.bin2hex(random_bytes(5)).'@example.test',
            'username' => 'dossier_'.bin2hex(random_bytes(5)), 'password' => Hash::make('irrelevant'), 'role' => $role,
        ]);
        $this->actingAs($user)->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
    }
}
