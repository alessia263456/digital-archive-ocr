<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Document;
use App\Models\DocumentDraft;
use App\Models\DocumentVersion;
use App\Services\ArchiveSearchIndexer;
use App\Services\FolderPermissionScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ArchiveBrowseSearchTest extends TestCase
{
    use RefreshDatabase;

    private int $dossierA;
    private int $dossierB;
    private string $documentA;
    private string $documentB;
    private User $readerDenied;
    private User $readerAllowed;

    protected function setUp(): void
    {
        parent::setUp();
        self::assertSame('pgsql', DB::connection()->getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME));
        self::assertSame('archive_p22m3_test', DB::scalar('select current_database()'));
        $this->artisan('migrate')->assertExitCode(0);

        $entryId = DB::table('nomenclature_entries')->insertGetId([
            'document_type' => 'Contract', 'subtype' => 'Vânzare', 'storage_context' => 'Standalone',
            'archival_indicator' => 'IA 1', 'retention_term' => '10', 'retention_years' => 10,
            'cs_flag' => false, 'retention_computation_base' => 'act_date', 'source_rule' => 'synthetic',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->dossierA = $this->dossier('29/2026', $entryId);
        $this->dossierB = $this->dossier('30/2026', $entryId);
        $admin = $this->user('admin');
        $this->readerDenied = $this->user('cititor');
        $this->readerAllowed = $this->user('cititor');
        DB::table('folder_permissions')->insert([
            ['physical_dossier_id' => $this->dossierA, 'principal_type' => 'role', 'user_id' => null, 'allowed' => true, 'created_at' => now(), 'updated_at' => now()],
            ['physical_dossier_id' => $this->dossierA, 'principal_type' => 'user', 'user_id' => $this->readerDenied->id, 'allowed' => false, 'created_at' => now(), 'updated_at' => now()],
            ['physical_dossier_id' => $this->dossierB, 'principal_type' => 'role', 'user_id' => null, 'allowed' => false, 'created_at' => now(), 'updated_at' => now()],
            ['physical_dossier_id' => $this->dossierB, 'principal_type' => 'user', 'user_id' => $this->readerAllowed->id, 'allowed' => true, 'created_at' => now(), 'updated_at' => now()],
            ['physical_dossier_id' => $this->dossierA, 'principal_type' => 'user', 'user_id' => $this->readerAllowed->id, 'allowed' => false, 'created_at' => now(), 'updated_at' => now()],
        ]);
        $this->documentA = $this->publishedDocument($admin, $this->dossierA, $entryId, '29/2026', 'încheiere redacted safe phrase', 'încheiere de autentificare', ['tag' => 'staff-secret']);
        $this->documentB = $this->publishedDocument($admin, $this->dossierB, $entryId, '30/2026', 'reader-only marker <img src=x> încheiere', 'contract cu <img src=x> și încheiere', ['tag' => 'alt-secret'], true);
        DB::table('archive_search_documents')->where('document_id', $this->documentB)->update(['approved_at' => now()->addMinute()]);
    }

    public function test_individual_permission_overrides_role_permission_in_browse_and_search(): void
    {
        self::assertSame([], app(FolderPermissionScope::class)->dossierIds($this->readerDenied));
        self::assertSame([$this->dossierB], app(FolderPermissionScope::class)->dossierIds($this->readerAllowed));
        $this->as($this->readerDenied);
        $this->getJson('/api/archive/browse')->assertOk()
            ->assertJsonCount(0, 'recent')->assertJsonCount(0, 'document_types')
            ->assertJsonCount(0, 'physical_dossiers')->assertJsonCount(0, 'years');
        $this->getJson('/api/documents?q=încheiere')->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);

        $this->as($this->readerAllowed);
        $browse = $this->getJson('/api/archive/browse')->assertOk();
        self::assertCount(1, $browse->json('recent'), json_encode($browse->json(), JSON_UNESCAPED_UNICODE));
        $browse
            ->assertJsonCount(1, 'recent')->assertJsonCount(1, 'document_types')
            ->assertJsonCount(1, 'physical_dossiers')->assertJsonCount(1, 'years')
            ->assertJsonPath('recent.0.physical_dossier_number', '30/2026');
        $this->getJson('/api/documents?q=încheiere')->assertOk()->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.document_id', $this->documentB)
            ->assertJsonPath('data.0.physical_dossier_number', '30/2026')
            ->assertJsonPath('data.0.version_number', 2)
            ->assertJsonMissing(['storage_key' => 'private-source-key'])
            ->assertJsonMissing(['tags' => ['alt-secret']]);
    }

    public function test_staff_access_is_unrestricted_and_queries_use_safe_romanian_highlights(): void
    {
        self::assertSame(2, DB::table('archive_search_documents')->whereRaw("to_tsvector('romanian', staff_text) @@ websearch_to_tsquery('romanian', ?)", ['încheiere'])->count());
        $this->as($this->user('arhivar'));
        $search = $this->getJson('/api/documents?q=încheiere&per_page=1')->assertOk();
        self::assertSame(2, $search->json('meta.total'), json_encode($search->json(), JSON_UNESCAPED_UNICODE));
        $search
            ->assertJsonPath('meta.total', 2)->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.document_id', $this->documentB)
            ->assertJsonPath('data.0.version_number', 2)
            ->assertJsonPath('data.0.physical_dossier_number', '30/2026')
            ->assertJsonPath('data.0.tags.0', 'alt-secret')
            ->assertJsonMissing(['storage_key' => 'private-source-key']);
        $highlight = $search->json('data.0.highlight');
        self::assertGreaterThan(0, $search->json('data.0.relevance'));
        self::assertStringContainsString('<mark>', $highlight);
        self::assertStringNotContainsString('<img', $highlight);
        $this->getJson('/api/documents?party=încheiere')->assertOk()->assertJsonPath('meta.total', 2);
        $this->getJson('/api/documents?tag=staff-secret')->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/archive/browse')->assertOk()->assertJsonCount(2, 'recent')
            ->assertJsonCount(1, 'document_types')->assertJsonCount(2, 'physical_dossiers');
    }

    public function test_reader_cannot_use_staff_parameters_and_bad_parameters_have_stable_error_shape(): void
    {
        $this->as($this->readerAllowed);
        $this->getJson('/api/documents?party=încheiere')->assertForbidden()
            ->assertJsonPath('eroare', 'Parametrul solicitat nu este disponibil pentru acest rol.')
            ->assertJsonPath('cod', 'parametru_interzis');
        $this->getJson('/api/documents?tag=staff-secret')->assertForbidden()->assertJsonPath('cod', 'parametru_interzis');
        $this->getJson('/api/documents?year=not-a-year')->assertUnprocessable()
            ->assertJsonPath('eroare', 'Parametrii de căutare nu sunt valizi.')
            ->assertJsonPath('cod', 'parametri_nevalizi');
        $this->getJson('/api/documents?unknown=value')->assertUnprocessable()->assertJsonPath('cod', 'parametri_nevalizi');
        $this->getJson('/api/documents?physical_dossier_id=999999')->assertOk()
            ->assertExactJson(['data' => [], 'meta' => ['current_page' => 1, 'per_page' => 20, 'total' => 0, 'last_page' => 1]]);
    }

    public function test_endpoints_require_a_session_and_current_reader_projection_never_matches_removed_text(): void
    {
        auth()->logout();
        $this->getJson('/api/archive/browse')->assertUnauthorized();
        $this->as($this->readerAllowed);
        $this->getJson('/api/documents?q=reader-only')->assertOk()->assertJsonPath('meta.total', 0);
        $this->as($this->user('admin'));
        $this->getJson('/api/documents?q=reader-only')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_indexer_removes_accepted_redactions_and_tags_from_the_reader_projection(): void
    {
        $unlocatedValue = 'UnlocatedSensitiveName';
        $pageText = 'CNP John Doe pentru contract '.$unlocatedValue;
        $unlocatedStart = mb_strpos($pageText, $unlocatedValue);
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(), 'source_format' => 'pdf', 'original_storage_keys' => ['private-source'],
            'original_names' => ['synthetic.pdf'], 'status' => 'review_ready', 'ocr_extraction_id' => (string) Str::uuid(),
            'metadata' => ['act_number' => '88', 'party_name' => 'John Doe', 'secondary_party' => $unlocatedValue, 'tags' => ['John Doe', $unlocatedValue]],
            'corrected_ocr' => [['page' => 1, 'text' => $pageText, 'base_text' => $pageText, 'operations' => []]],
            'pii_candidates' => [[
                'id' => (string) Str::uuid(), 'disposition' => 'redact', 'confidence' => 99,
                'review_status' => 'pending', 'page' => 1, 'location_status' => 'reliable',
                'bounding_boxes' => [['left' => 20, 'top' => 10, 'width' => 30, 'height' => 10]],
                'corrected_text_span' => ['start' => 4, 'length' => 8],
            ], [
                'id' => (string) Str::uuid(), 'disposition' => 'review', 'confidence' => 97,
                'review_status' => 'pending', 'page' => 1, 'location_status' => 'manual_review_required',
                'bounding_boxes' => [],
                'corrected_text_span' => ['start' => $unlocatedStart, 'length' => mb_strlen($unlocatedValue)],
            ]],
            'redaction_marks' => [],
        ]);
        DB::table('ocr_pages')->insert([
            'extraction' => $draft->ocr_extraction_id, 'source_sha256' => str_repeat('c', 64),
            'page' => 1, 'width' => 400, 'height' => 100, 'text' => $pageText, 'tsv' => '',
            'words' => json_encode([
                ['text' => 'CNP', 'left' => 1, 'top' => 10, 'width' => 10, 'height' => 10],
                ['text' => 'John', 'left' => 20, 'top' => 10, 'width' => 12, 'height' => 10],
                ['text' => 'Doe', 'left' => 35, 'top' => 10, 'width' => 12, 'height' => 10],
                ['text' => 'pentru', 'left' => 52, 'top' => 10, 'width' => 14, 'height' => 10],
                ['text' => 'contract', 'left' => 70, 'top' => 10, 'width' => 20, 'height' => 10],
                ['text' => $unlocatedValue, 'left' => 100, 'top' => 10, 'width' => 100, 'height' => 10],
            ]),
        ]);

        $document = Document::query()->findOrFail($this->documentB);
        $version = DocumentVersion::query()->findOrFail($document->current_version_id);
        $document->metadata = array_merge($document->metadata, ['party_name' => 'John Doe', 'secondary_party' => $unlocatedValue, 'tags' => ['John Doe', $unlocatedValue]]);
        $document->save();
        app(ArchiveSearchIndexer::class)->reindex($draft, $document, $version);
        $indexed = DB::table('archive_search_documents')->where('document_id', $document->id)->first();
        $readerMetadata = json_decode($indexed->reader_metadata, true, flags: JSON_THROW_ON_ERROR);

        self::assertStringContainsString('John Doe', $indexed->staff_text);
        self::assertSame($version->id, $indexed->version_id);
        self::assertStringNotContainsString('John Doe', $indexed->reader_text);
        self::assertStringContainsString('CNP pentru contract '.$unlocatedValue, $indexed->reader_text);
        self::assertArrayNotHasKey('party_name', $readerMetadata);
        self::assertSame($unlocatedValue, $readerMetadata['secondary_party']);
        self::assertArrayNotHasKey('tags', $readerMetadata);
        $this->as($this->readerAllowed);
        $this->getJson('/api/documents?q='.$unlocatedValue)->assertOk()->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.document_id', $document->id);
    }

    private function dossier(string $number, int $entryId): int
    {
        return DB::table('physical_dossiers')->insertGetId([
            'physical_dossier_number' => $number, 'archival_indicator' => 'IA 1',
            'inventory_number' => 'INV-'.$number, 'retention_time' => '10', 'description' => null,
        ]);
    }

    private function user(string $role): User
    {
        $suffix = bin2hex(random_bytes(4));
        return User::query()->create([
            'name' => 'Archive test', 'email' => $suffix.'@example.test', 'username' => 'archive_'.$suffix,
            'password' => Hash::make('synthetic-test-password'), 'role' => $role,
        ]);
    }

    private function publishedDocument(User $owner, int $dossierId, int $entryId, string $number, string $staffText, string $readerText, array $extra, bool $twoVersions = false): string
    {
        $documentId = (string) Str::uuid();
        $versionId = (string) Str::uuid();
        $metadata = ['act_date' => '2026-11-27', 'act_number' => $number, 'physical_dossier_id' => $dossierId,
            'physical_dossier_number' => $number, 'inventory_number' => 'INV-'.$number, 'tags' => [$extra['tag']]];
        DB::table('documents')->insert([
            'id' => $documentId, 'physical_dossier_id' => $dossierId, 'nomenclature_entry_id' => $entryId,
            'metadata' => json_encode($metadata), 'current_version_id' => null, 'created_by' => $owner->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $oldVersionId = null;
        if ($twoVersions) {
            $oldVersionId = (string) Str::uuid();
            $this->version($oldVersionId, $documentId, $entryId, $metadata, 1, now()->subDay());
        }
        $this->version($versionId, $documentId, $entryId, $metadata, $twoVersions ? 2 : 1, now());
        DB::table('documents')->where('id', $documentId)->update(['current_version_id' => $versionId]);
        DB::table('archive_search_documents')->insert([
            'document_id' => $documentId, 'version_id' => $versionId, 'physical_dossier_id' => $dossierId,
            'nomenclature_entry_id' => $entryId, 'staff_metadata' => json_encode($metadata),
            'reader_metadata' => json_encode(array_diff_key($metadata, ['tags' => true, 'physical_dossier_id' => true])),
            'staff_text' => $staffText.' '.$extra['tag'], 'reader_text' => $readerText,
            'document_type' => 'Contract', 'act_date' => '2026-11-27', 'approved_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $documentId;
    }

    private function version(string $versionId, string $documentId, int $entryId, array $metadata, int $number, mixed $approvedAt): void
    {
        DB::table('document_versions')->insert([
            'id' => $versionId, 'document_id' => $documentId, 'version_number' => $number,
            'source_storage_keys' => json_encode(['private-source-key']), 'source_sha256' => str_repeat('a', 64),
            'image_sha256s' => null, 'redacted_pdf_storage_key' => 'private-redacted-key',
            'redacted_sha256' => str_repeat('b', 64), 'metadata' => json_encode($metadata),
            'nomenclature_entry_id' => $entryId, 'retention_status' => 'calculated', 'retention_base_date' => '2026-11-27',
            'first_eligible_date' => '2036-11-27', 'approved_by' => DB::table('users')->value('id'),
            'approved_at' => $approvedAt, 'created_at' => $approvedAt, 'updated_at' => $approvedAt,
        ]);
    }

    private function as(User $user): void
    {
        $this->actingAs($user)->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
    }
}
