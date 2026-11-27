<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\NomenclatureEntry;
use App\Models\PhysicalDossier;
use App\Models\User;
use Database\Seeders\NomenclatureSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DocumentPublicationTest extends TestCase
{
    use RefreshDatabase;

    private PhysicalDossier $dossier;
    private NomenclatureEntry $classification;
    private string $source;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('documents');
        Config::set('filesystems.default_document_disk', 'documents');
        $this->seed(NomenclatureSeeder::class);
        $this->classification = NomenclatureEntry::query()->where('retention_term', 'P')->firstOrFail();
        $this->dossier = PhysicalDossier::query()->create([
            'physical_dossier_number' => '29/2026', 'archival_indicator' => $this->classification->archival_indicator,
            'inventory_number' => 'INV-29/2026', 'retention_time' => $this->classification->retention_term,
        ]);
        $this->source = file_get_contents(base_path('tests/Fixtures/rendering/mark.pdf'));
        $this->asRole('admin');
    }

    public function test_initial_publication_is_immutable_and_idempotent(): void
    {
        $draft = $this->readyDraft($this->source, 'drafts/initial.pdf');
        $snapshot = $this->prepareReview($draft);
        $payload = ['review_snapshot' => $snapshot];

        $first = $this->withHeader('Idempotency-Key', 'publish-initial-1')
            ->postJson('/api/drafts/'.$draft->id.'/publish', $payload)
            ->assertCreated()->assertJsonPath('version_number', 1)->assertJsonPath('retention.status', 'permanent');
        $replayed = $this->withHeader('Idempotency-Key', 'publish-initial-1')
            ->postJson('/api/drafts/'.$draft->id.'/publish', $payload)
            ->assertCreated()->assertJsonPath('version_id', $first->json('version_id'));

        self::assertEquals($first->json(), $replayed->json());
        self::assertSame('published', $draft->fresh()->status);
        self::assertDatabaseCount('documents', 1);
        self::assertDatabaseCount('document_versions', 1);
        self::assertDatabaseCount('publication_requests', 1);
        $version = DB::table('document_versions')->where('id', $first->json('version_id'))->first();
        self::assertNotSame('drafts/initial.pdf', json_decode($version->source_storage_keys, true)[0]);
        self::assertTrue(Storage::disk('documents')->exists(json_decode($version->source_storage_keys, true)[0]));
        self::assertTrue(Storage::disk('documents')->exists($version->redacted_pdf_storage_key));
        self::assertSame($this->source, Storage::disk('documents')->get('drafts/initial.pdf'));
    }

    public function test_exact_duplicate_blocks_even_when_separate_document_is_requested(): void
    {
        $first = $this->readyDraft($this->source, 'drafts/first.pdf');
        $firstSnapshot = $this->prepareReview($first);
        $this->withHeader('Idempotency-Key', 'publish-exact-first')->postJson('/api/drafts/'.$first->id.'/publish', [
            'review_snapshot' => $firstSnapshot,
        ])->assertCreated();

        $duplicate = $this->readyDraft($this->source, 'drafts/duplicate.pdf');
        $snapshot = $this->prepareReview($duplicate);
        $this->withHeader('Idempotency-Key', 'publish-exact-second')->postJson('/api/drafts/'.$duplicate->id.'/publish', [
            'review_snapshot' => $snapshot, 'duplicate_action' => 'separate',
        ])->assertStatus(409)->assertJsonPath('cod', 'exact_duplicate');

        self::assertDatabaseCount('documents', 1);
        self::assertDatabaseCount('document_versions', 1);
        self::assertSame('review_ready', $duplicate->fresh()->status);
    }

    public function test_possible_duplicate_requires_an_explicit_outcome(): void
    {
        $first = $this->readyDraft($this->source, 'drafts/possible-first.pdf', 'same-act');
        $snapshot = $this->prepareReview($first);
        $published = $this->withHeader('Idempotency-Key', 'possible-first')->postJson('/api/drafts/'.$first->id.'/publish', [
            'review_snapshot' => $snapshot,
        ])->assertCreated();

        $different = $this->source."\n% possible duplicate variant\n";
        $second = $this->readyDraft($different, 'drafts/possible-second.pdf', 'same-act');
        $secondSnapshot = $this->prepareReview($second);
        $this->withHeader('Idempotency-Key', 'possible-second')->postJson('/api/drafts/'.$second->id.'/publish', [
            'review_snapshot' => $secondSnapshot,
        ])->assertStatus(409)->assertJsonPath('cod', 'possible_duplicate')
            ->assertJsonPath('options.0', 'version')->assertJsonPath('options.1', 'separate')->assertJsonPath('options.2', 'cancel');

        $separate = $this->withHeader('Idempotency-Key', 'possible-separate')->postJson('/api/drafts/'.$second->id.'/publish', [
            'review_snapshot' => $secondSnapshot, 'duplicate_action' => 'separate',
        ])->assertCreated();
        self::assertNotSame($published->json('document_id'), $separate->json('document_id'));
        self::assertDatabaseCount('documents', 2);
    }

    public function test_replacement_appends_version_and_stale_review_requires_reconfirmation(): void
    {
        $first = $this->readyDraft($this->source, 'drafts/replace-first.pdf', 'replace-act');
        $firstSnapshot = $this->prepareReview($first);
        $published = $this->withHeader('Idempotency-Key', 'replace-first')->postJson('/api/drafts/'.$first->id.'/publish', [
            'review_snapshot' => $firstSnapshot,
        ])->assertCreated();

        $replacementBytes = $this->source."\n% replacement version\n";
        $replacement = $this->readyDraft($replacementBytes, 'drafts/replacement.pdf', 'replacement-act');
        $snapshot = $this->prepareReview($replacement);
        $this->patchJson('/api/drafts/'.$replacement->id.'/metadata', [
            'metadata' => ['act_number' => 'CHANGED AFTER REVIEW'],
        ])->assertOk();
        $this->withHeader('Idempotency-Key', 'replacement-stale')->postJson('/api/drafts/'.$replacement->id.'/publish', [
            'review_snapshot' => $snapshot, 'target_document_id' => $published->json('document_id'),
            'target_version_id' => $published->json('version_id'), 'duplicate_action' => 'version',
        ])->assertStatus(409)->assertJsonPath('cod', 'review_stale');
        self::assertDatabaseCount('document_versions', 1);
    }

    public function test_ocr_and_pii_changes_after_review_require_fresh_review(): void
    {
        $ocrDraft = $this->readyDraft($this->source."\n% ocr-state", 'drafts/ocr-state.pdf', 'ocr-state');
        $ocrSnapshot = $this->prepareReview($ocrDraft);
        $ocrDraft = $ocrDraft->fresh();
        $ocrDraft->ocr_revision = (int) $ocrDraft->ocr_revision + 1;
        $ocrDraft->save();
        $this->withHeader('Idempotency-Key', 'publish-stale-ocr')->postJson('/api/drafts/'.$ocrDraft->id.'/publish', [
            'review_snapshot' => $ocrSnapshot,
        ])->assertStatus(409)->assertJsonPath('cod', 'review_stale');

        $piiDraft = $this->readyDraft($this->source."\n% pii-state", 'drafts/pii-state.pdf', 'pii-state');
        $piiSnapshot = $this->prepareReview($piiDraft);
        $piiDraft->pii_candidates = [[
            'id' => 'candidate-1', 'category' => 'persoană', 'review_status' => 'rejected',
            'location_status' => 'reliable', 'bounding_boxes' => [], 'page' => 1,
        ]];
        $piiDraft->save();
        $this->withHeader('Idempotency-Key', 'publish-stale-pii')->postJson('/api/drafts/'.$piiDraft->id.'/publish', [
            'review_snapshot' => $piiSnapshot,
        ])->assertStatus(409)->assertJsonPath('cod', 'review_stale');

        self::assertDatabaseCount('documents', 0);
        self::assertDatabaseCount('document_versions', 0);
    }

    public function test_failed_database_publication_removes_staged_objects_and_all_rows(): void
    {
        $draft = $this->readyDraft($this->source, 'drafts/failing.pdf');
        $snapshot = $this->prepareReview($draft);
        DB::unprepared("CREATE FUNCTION fail_version_insert() RETURNS trigger AS \$\$ BEGIN RAISE EXCEPTION 'synthetic database failure'; END; \$\$ LANGUAGE plpgsql");
        DB::unprepared('CREATE TRIGGER fail_version_insert BEFORE INSERT ON document_versions FOR EACH ROW EXECUTE FUNCTION fail_version_insert()');
        try {
            $this->withHeader('Idempotency-Key', 'publish-db-failure')->postJson('/api/drafts/'.$draft->id.'/publish', [
                'review_snapshot' => $snapshot,
            ])->assertStatus(503)->assertJsonPath('cod', 'storage_failure');
        } finally {
            DB::unprepared('DROP TRIGGER IF EXISTS fail_version_insert ON document_versions');
            DB::unprepared('DROP FUNCTION IF EXISTS fail_version_insert()');
        }
        self::assertDatabaseCount('documents', 0);
        self::assertDatabaseCount('document_versions', 0);
        self::assertDatabaseCount('publication_requests', 0);
        self::assertSame([], Storage::disk('documents')->allFiles('versions'));
        self::assertSame('review_ready', $draft->fresh()->status);
    }

    private function readyDraft(string $contents, string $key, string $actNumber = '41'): DocumentDraft
    {
        Storage::disk('documents')->put($key, $contents);
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(), 'source_format' => 'pdf', 'original_storage_keys' => [$key],
            'original_names' => [basename($key)], 'document_sha256' => hash('sha256', $contents),
            'status' => 'review_ready', 'ocr_extraction_id' => (string) Str::uuid(),
        ]);
        DB::table('ocr_pages')->insert([
            'extraction' => $draft->ocr_extraction_id, 'source_sha256' => hash('sha256', $contents),
            'page' => 1, 'width' => 100, 'height' => 100, 'text' => '', 'tsv' => '', 'words' => '[]',
        ]);
        $draft->metadata_suggestions = [];
        $draft->save();
        $this->draftActNumbers[$draft->id] = $actNumber;
        return $draft;
    }

    private array $draftActNumbers = [];

    private function prepareReview(DocumentDraft $draft): string
    {
        $editor = $this->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk();
        $metadata = $this->patchJson('/api/drafts/'.$draft->id.'/metadata', [
            'metadata' => [
                'act_date' => '2026-11-20', 'act_number' => $this->draftActNumbers[$draft->id],
                'physical_dossier_id' => $this->dossier->id,
            ],
            'nomenclature_entry_id' => $this->classification->id,
        ])->assertOk();
        $this->postJson('/api/drafts/'.$draft->id.'/metadata/confirm', [
            'metadata_revision' => $metadata->json('metadata_revision'),
            'ocr_revision' => $metadata->json('ocr_revision'),
        ])->assertOk();
        $this->postJson('/api/drafts/'.$draft->id.'/editor/redaction-preview')->assertOk();
        $review = $this->postJson('/api/drafts/'.$draft->id.'/review/confirm', [
            'metadata_revision' => $metadata->json('metadata_revision'),
            'ocr_revision' => $editor->json('ocr_revision'),
            'detection_revision' => $editor->json('detection_revision'),
            'redaction_ocr_revision' => $editor->json('ocr_revision'),
            'redaction_detection_revision' => $editor->json('detection_revision'),
        ])->assertOk()->assertJsonPath('review_confirmed', true);
        return $review->json('review_snapshot');
    }

    private function asRole(string $role): void
    {
        $user = User::query()->create([
            'name' => 'Publication User', 'email' => 'publication-'.bin2hex(random_bytes(5)).'@example.test',
            'username' => 'publication_'.bin2hex(random_bytes(5)), 'password' => bcrypt('irrelevant'), 'role' => $role,
        ]);
        $this->actingAs($user)->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
    }
}
