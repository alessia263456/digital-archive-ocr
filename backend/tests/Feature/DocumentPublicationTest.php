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
        self::assertDatabaseCount('archive_search_documents', 1);
        $indexed = DB::table('archive_search_documents')->where('document_id', $first->json('document_id'))->first();
        self::assertSame($first->json('version_id'), $indexed->version_id);
        self::assertStringContainsString('41', $indexed->staff_text);
        self::assertStringContainsString('Contract de vânzare', $indexed->reader_text);
        self::assertDatabaseCount('publication_requests', 1);
        $version = DB::table('document_versions')->where('id', $first->json('version_id'))->first();
        self::assertNotSame('drafts/initial.pdf', json_decode($version->source_storage_keys, true)[0]);
        self::assertTrue(Storage::disk('documents')->exists(json_decode($version->source_storage_keys, true)[0]));
        self::assertTrue(Storage::disk('documents')->exists($version->redacted_pdf_storage_key));
        self::assertSame($this->source, Storage::disk('documents')->get('drafts/initial.pdf'));
    }

    public function test_publication_succeeds_when_reader_search_must_omit_an_unaligned_ocr_page(): void
    {
        $draft = $this->readyDraft($this->source."\n% unaligned-ocr", 'drafts/unaligned-ocr.pdf', 'unaligned-ocr');
        DB::table('ocr_pages')->where('extraction', $draft->ocr_extraction_id)->update([
            'text' => 'CNP John Doe other text',
            'words' => json_encode([
                ['text' => 'CNP', 'left' => 1, 'top' => 1, 'width' => 10, 'height' => 10],
                ['text' => 'John', 'left' => 12, 'top' => 1, 'width' => 20, 'height' => 10],
                ['text' => 'Doe', 'left' => 34, 'top' => 1, 'width' => 15, 'height' => 10],
                ['text' => 'other', 'left' => 50, 'top' => 1, 'width' => 20, 'height' => 10],
                ['text' => 'text', 'left' => 72, 'top' => 1, 'width' => 20, 'height' => 10],
            ], JSON_THROW_ON_ERROR),
        ]);
        $draft->corrected_ocr = [[
            'page' => 1, 'text' => 'CNP John Doe revised text',
            'base_text' => 'CNP John Doe revised text', 'operations' => [],
        ]];
        $candidateId = (string) Str::uuid();
        $draft->pii_candidates = [[
            'id' => $candidateId, 'category' => 'name', 'disposition' => 'redact',
            'confidence' => 99, 'page' => 1, 'location_status' => 'reliable',
            'bounding_boxes' => [['left' => 12, 'top' => 1, 'width' => 37, 'height' => 10]],
            'corrected_text_span' => ['start' => 4, 'length' => 8],
        ]];
        $draft->detection_status = 'ready';
        $draft->ocr_revision = 1;
        $draft->detection_revision = 1;
        $draft->save();

        $snapshot = $this->prepareReview($draft);
        self::assertSame($candidateId, $draft->fresh()->pii_candidates[0]['id']);
        $published = $this->withHeader('Idempotency-Key', 'publish-unaligned-reader-ocr')->postJson('/api/drafts/'.$draft->id.'/publish', [
            'review_snapshot' => $snapshot,
        ])->assertCreated();

        $indexed = DB::table('archive_search_documents')->where('document_id', $published->json('document_id'))->first();
        self::assertStringNotContainsString('John Doe', $indexed->reader_text);
        self::assertStringNotContainsString('revised', $indexed->reader_text);
        self::assertStringContainsString('John Doe', $indexed->staff_text);
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

    public function test_replacement_publication_replaces_the_single_current_search_projection(): void
    {
        $first = $this->readyDraft($this->source, 'drafts/index-first.pdf', 'index-first');
        $firstSnapshot = $this->prepareReview($first);
        $published = $this->withHeader('Idempotency-Key', 'index-first')->postJson('/api/drafts/'.$first->id.'/publish', [
            'review_snapshot' => $firstSnapshot,
        ])->assertCreated();

        $replacement = $this->readyDraft($this->source."\n% changed searchable metadata", 'drafts/index-replacement.pdf', 'index-replacement');
        $replacementSnapshot = $this->prepareReview($replacement);
        $current = $this->withHeader('Idempotency-Key', 'index-replacement')->postJson('/api/drafts/'.$replacement->id.'/publish', [
            'review_snapshot' => $replacementSnapshot,
            'target_document_id' => $published->json('document_id'),
            'target_version_id' => $published->json('version_id'),
            'duplicate_action' => 'version',
        ])->assertOk()->assertJsonPath('version_number', 2);

        self::assertDatabaseCount('document_versions', 2);
        self::assertDatabaseCount('archive_search_documents', 1);
        $indexed = DB::table('archive_search_documents')->where('document_id', $published->json('document_id'))->first();
        self::assertSame($current->json('version_id'), $indexed->version_id);
        self::assertSame('index-replacement', json_decode($indexed->staff_metadata, true)['act_number']);
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
            'location_status' => 'reliable', 'bounding_boxes' => [['left' => 1, 'top' => 1, 'width' => 1, 'height' => 1]],
            'page' => 1, 'corrected_text_span' => ['start' => 0, 'length' => 1],
        ]];
        $piiDraft->save();
        $this->withHeader('Idempotency-Key', 'publish-stale-pii')->postJson('/api/drafts/'.$piiDraft->id.'/publish', [
            'review_snapshot' => $piiSnapshot,
        ])->assertStatus(409)->assertJsonPath('cod', 'review_stale');

        self::assertDatabaseCount('documents', 0);
        self::assertDatabaseCount('document_versions', 0);
    }

    public function test_automatic_redaction_exclusion_change_invalidates_final_review_and_publication(): void
    {
        $draft = $this->readyDraft($this->source."\n% automatic-redaction", 'drafts/automatic-redaction.pdf', 'automatic-redaction');
        $snapshot = $this->prepareReview($draft);
        $draft = $draft->fresh();
        $draft->redaction_excluded_candidate_ids = [(string) \Illuminate\Support\Str::uuid()];
        $draft->save();
        $this->withHeader('Idempotency-Key', 'publish-stale-redaction')->postJson('/api/drafts/'.$draft->id.'/publish', [
            'review_snapshot' => $snapshot,
        ])->assertStatus(409)->assertJsonPath('cod', 'review_stale');
        self::assertDatabaseCount('documents', 0);
        self::assertDatabaseCount('document_versions', 0);
    }

    public function test_final_review_and_publication_omit_a_candidate_without_safe_geometry(): void
    {
        $draft = $this->readyDraft($this->source."\n% missing-location", 'drafts/missing-location.pdf', 'missing-location');
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

        $draft->pii_candidates = [[
            'id' => (string) Str::uuid(), 'category' => 'name', 'disposition' => 'review', 'confidence' => 42,
            'page' => 1, 'location_status' => 'manual_review_required', 'bounding_boxes' => [],
            'corrected_text_span' => ['start' => 0, 'length' => 8], 'review_status' => 'pending',
        ]];
        $draft->redaction_ocr_revision = 1;
        $draft->redaction_detection_revision = 1;
        $draft->save();

        $this->postJson('/api/drafts/'.$draft->id.'/editor/redaction-preview')->assertOk();
        $review = $this->postJson('/api/drafts/'.$draft->id.'/review/confirm', [
            'metadata_revision' => $metadata->json('metadata_revision'),
            'ocr_revision' => $editor->json('ocr_revision'),
            'detection_revision' => $editor->json('detection_revision'),
            'redaction_ocr_revision' => $editor->json('ocr_revision'),
            'redaction_detection_revision' => $editor->json('detection_revision'),
        ])->assertOk()->assertJsonPath('review_confirmed', true);
        $this->withHeader('Idempotency-Key', 'publish-unlocated-candidate')->postJson('/api/drafts/'.$draft->id.'/publish', [
            'review_snapshot' => $review->json('review_snapshot'),
        ])->assertCreated();
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
            'page' => 1, 'width' => 100, 'height' => 100,
            'text' => 'Contract de vânzare; act numărul '.$actNumber, 'tsv' => '', 'words' => '[]',
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
