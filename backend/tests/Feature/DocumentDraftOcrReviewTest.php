<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\User;
use App\Services\DocumentDraftPiiReview;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DocumentDraftOcrReviewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
        $this->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
    }

    public function test_editor_returns_source_and_corrected_ocr_and_review_candidates_without_matched_text(): void
    {
        $draft = $this->readyDraft();
        $this->staff()->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk()
            ->assertJsonPath('ocr_revision', 1)
            ->assertJsonPath('detection_status', 'ready')
            ->assertJsonPath('pages.0.source_text', 'CNP 1960523123456')
            ->assertJsonPath('pages.0.corrected_text', 'CNP 1960523123456')
            ->assertJsonPath('candidates.0.corrected_text_span.start', 4)
            ->assertJsonMissingPath('candidates.0.text');
    }

    public function test_saving_corrections_advances_revision_invalidates_previous_candidates_and_records_value_free_audit(): void
    {
        $draft = $this->readyDraft();
        $response = $this->staff()->patchJson('/api/drafts/'.$draft->id.'/editor/ocr', [
            'ocr_revision' => 1,
            'pages' => [['page' => 1, 'text' => 'CNP 1960523123456 corectat']],
        ])->assertOk()->assertJsonPath('ocr_revision', 2)->assertJsonPath('detection_status', 'ready');

        self::assertNotEmpty($response->json('candidates'));
        self::assertSame('CNP 1960523123456', DB::table('ocr_pages')->where('extraction', $draft->ocr_extraction_id)->value('text'));
        self::assertSame('CNP 1960523123456 corectat', $draft->fresh()->corrected_ocr[0]['text']);
        self::assertDatabaseHas('draft_access_events', ['draft_id' => $draft->id, 'event' => 'ocr_corrections_saved']);
        self::assertStringNotContainsString('1960523123456', DB::table('draft_access_events')->where('draft_id', $draft->id)->get()->toJson());
    }

    public function test_review_requires_current_revisions_and_persists_candidate_decisions(): void
    {
        $draft = $this->readyDraft();
        $editor = $this->staff()->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk()->json();
        $candidate = $editor['candidates'][0];
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/pii-review', [
            'ocr_revision' => 2, 'detection_revision' => $editor['detection_revision'],
            'decisions' => [['id' => $candidate['id'], 'review_status' => 'accepted']],
        ])->assertStatus(409);
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/pii-review', [
            'ocr_revision' => 1, 'detection_revision' => $editor['detection_revision'],
            'decisions' => [['id' => $candidate['id'], 'review_status' => 'accepted']],
        ])->assertOk()->assertJsonPath('candidates.0.review_status', 'accepted');
    }

    public function test_split_candidate_text_requires_manual_location_review_and_has_no_boxes(): void
    {
        $draft = $this->readyDraft();
        $response = $this->staff()->patchJson('/api/drafts/'.$draft->id.'/editor/ocr', [
            'ocr_revision' => 1,
            'pages' => [['page' => 1, 'text' => 'CNP 196052 3123456']],
        ])->assertOk()->assertJsonPath('detection_status', 'ready');

        self::assertSame('manual_review_required', $response->json('candidates.0.location_status'));
        self::assertSame([], $response->json('candidates.0.bounding_boxes'));
        self::assertSame('review', $response->json('candidates.0.disposition'));
        self::assertArrayNotHasKey('text', $response->json('candidates.0'));
    }

    public function test_failed_detection_invalidates_candidates_and_disables_review(): void
    {
        $draft = $this->readyDraft();
        $this->mock(DocumentDraftPiiReview::class, function ($mock): void {
            $mock->shouldReceive('detect')->twice()->andThrow(new \RuntimeException('synthetic detector failure'));
        });

        $this->staff()->patchJson('/api/drafts/'.$draft->id.'/editor/ocr', [
            'ocr_revision' => 1, 'pages' => [['page' => 1, 'text' => 'CNP 1960523123456 corectat']],
        ])->assertStatus(500)->assertJsonPath('detection_status', 'failed')->assertJsonPath('ocr_revision', 2);

        $editor = $this->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk()
            ->assertJsonPath('detection_status', 'failed')->assertJsonCount(0, 'candidates');
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/pii-review', [
            'ocr_revision' => 2, 'detection_revision' => 0,
            'decisions' => [['id' => (string) Str::uuid(), 'review_status' => 'accepted']],
        ])->assertStatus(409);
        self::assertSame('CNP 1960523123456 corectat', $editor->json('pages.0.corrected_text'));
    }

    public function test_only_admin_and_archivar_can_open_and_update_editor(): void
    {
        $draft = $this->readyDraft();
        $this->staff('cititor')->getJson('/api/drafts/'.$draft->id.'/editor')->assertForbidden();
        $this->staff('cititor')->patchJson('/api/drafts/'.$draft->id.'/editor/ocr', [])->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/drafts/'.$draft->id.'/editor')->assertUnauthorized();
    }

    private function readyDraft(): DocumentDraft
    {
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(), 'source_format' => 'pdf', 'original_storage_keys' => ['private/source.pdf'], 'status' => 'review_ready',
        ]);
        $extraction = (string) Str::uuid();
        DB::table('ocr_pages')->insert([
            'extraction' => $extraction, 'source_sha256' => str_repeat('a', 64), 'page' => 1,
            'width' => 100, 'height' => 200, 'text' => 'CNP 1960523123456', 'tsv' => 'private',
            'words' => json_encode([
                ['text' => 'CNP', 'confidence' => 99, 'left' => 1, 'top' => 1, 'width' => 20, 'height' => 10],
                ['text' => '1960523123456', 'confidence' => 99, 'left' => 22, 'top' => 1, 'width' => 50, 'height' => 10],
            ], JSON_THROW_ON_ERROR),
        ]);
        $draft->ocr_extraction_id = $extraction;
        $draft->save();
        return $draft->fresh();
    }

    private function staff(string $role = 'arhivar'): self
    {
        $user = User::query()->create([
            'name' => 'Editor Test', 'email' => 'editor-'.bin2hex(random_bytes(5)).'@example.test',
            'username' => 'editor_'.bin2hex(random_bytes(5)), 'password' => 'test-password', 'role' => $role,
        ]);
        return $this->actingAs($user, 'web');
    }
}
