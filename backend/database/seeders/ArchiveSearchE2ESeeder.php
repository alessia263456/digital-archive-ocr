<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ArchiveSearchE2ESeeder extends Seeder
{
    public function run(): void
    {
        $username = (string) env('P22_DS001_TEST_USERNAME');
        $password = (string) env('P22_DS001_TEST_PASSWORD');
        if ($username === '' || $password === '') {
            throw new RuntimeException('Set the runtime DS-001 browser test credentials before seeding.');
        }

        DB::transaction(function () use ($username, $password): void {
            $admin = User::query()->updateOrCreate(
                ['username' => $username],
                ['name' => 'DS-001 browser test', 'email' => 'p22ds001-test@example.test', 'password' => $password, 'role' => 'admin'],
            );
            $entry = DB::table('nomenclature_entries')->where('document_type', 'Procură')->orderBy('id')->first();
            if ($entry === null) {
                throw new RuntimeException('Seed the Notarial Nomenclature before the DS-001 browser fixtures.');
            }

            $dossierNumber = 'P22-34-DS001';
            DB::table('physical_dossiers')->updateOrInsert(
                ['physical_dossier_number' => $dossierNumber],
                ['archival_indicator' => $entry->archival_indicator, 'inventory_number' => 'P22-34-DS001',
                    'retention_time' => $entry->retention_term, 'description' => 'Fixture DS-001'],
            );
            $dossierId = (int) DB::table('physical_dossiers')->where('physical_dossier_number', $dossierNumber)->value('id');

            for ($index = 0; $index < 8; $index++) {
                $number = $index + 1;
                $documentId = sprintf('34000000-0034-4034-8034-%012d', $number);
                $versionId = sprintf('34000000-0034-4034-8034-%012d', $number + 100);
                $actDate = sprintf('%04d-01-01', 2019 + $index);
                $approvedAt = now()->subDays($index)->startOfDay();
                $metadata = [
                    'act_number' => 'DS001-'.$number,
                    'act_date' => $actDate,
                    'physical_dossier_id' => $dossierId,
                    'physical_dossier_number' => $dossierNumber,
                    'inventory_number' => 'P22-34-DS001',
                    'tags' => ['DS-001 test'],
                ];

                DB::table('documents')->updateOrInsert(
                    ['id' => $documentId],
                    ['physical_dossier_id' => $dossierId, 'nomenclature_entry_id' => $entry->id,
                        'metadata' => json_encode($metadata, JSON_THROW_ON_ERROR), 'current_version_id' => null,
                        'created_by' => $admin->id, 'created_at' => $approvedAt, 'updated_at' => $approvedAt],
                );
                DB::table('document_versions')->updateOrInsert(
                    ['id' => $versionId],
                    ['document_id' => $documentId, 'version_number' => 1,
                        'source_storage_keys' => json_encode(['synthetic-ds001-source'], JSON_THROW_ON_ERROR),
                        'source_sha256' => hash('sha256', $documentId), 'image_sha256s' => null,
                        'redacted_pdf_storage_key' => 'synthetic-ds001-redacted', 'redacted_sha256' => hash('sha256', $versionId),
                        'metadata' => json_encode($metadata, JSON_THROW_ON_ERROR), 'nomenclature_entry_id' => $entry->id,
                        'retention_status' => 'calculated', 'retention_base_date' => $actDate,
                        'first_eligible_date' => null, 'approved_by' => $admin->id,
                        'approved_at' => $approvedAt, 'created_at' => $approvedAt, 'updated_at' => $approvedAt],
                );
                DB::table('documents')->where('id', $documentId)->update(['current_version_id' => $versionId]);
                DB::table('archive_search_documents')->updateOrInsert(
                    ['document_id' => $documentId],
                    ['version_id' => $versionId, 'physical_dossier_id' => $dossierId, 'nomenclature_entry_id' => $entry->id,
                        'staff_metadata' => json_encode($metadata, JSON_THROW_ON_ERROR),
                        'reader_metadata' => json_encode(array_diff_key($metadata, ['tags' => true]), JSON_THROW_ON_ERROR),
                        'staff_text' => 'Document controlat pentru căutarea DS-001',
                        'reader_text' => 'Document controlat pentru căutarea DS-001',
                        'document_type' => 'Procură', 'act_date' => $actDate, 'approved_at' => $approvedAt,
                        'created_at' => $approvedAt, 'updated_at' => $approvedAt],
                );
            }
        });
    }
}
