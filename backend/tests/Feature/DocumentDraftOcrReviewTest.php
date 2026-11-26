<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\User;
use App\Services\DocumentDraftPiiReview;
use App\Services\DocumentPageRenderer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
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

    public function test_manual_redaction_marks_are_revision_bound_and_page_bounded(): void
    {
        $draft = $this->readyDraft();
        $this->staff()->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk();
        $payload = ['ocr_revision' => 1, 'detection_revision' => 1, 'marks' => [
            ['page' => 1, 'box' => ['left' => 90, 'top' => 190, 'width' => 11, 'height' => 11]],
        ]];
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/redaction-marks', $payload)->assertUnprocessable();
        $payload['marks'][0]['box'] = ['left' => 20, 'top' => 20, 'width' => 10, 'height' => 10];
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/redaction-marks', $payload)->assertOk();
        self::assertSame($payload['marks'][0]['page'], $draft->fresh()->redaction_marks[0]['page']);
        self::assertSame($payload['marks'][0]['box']['left'], $draft->fresh()->redaction_marks[0]['box']['left']);
        self::assertSame($payload['marks'][0]['box']['top'], $draft->fresh()->redaction_marks[0]['box']['top']);
        $payload['ocr_revision'] = 2;
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/redaction-marks', $payload)->assertStatus(409);
    }

    public function test_reader_role_cannot_save_marks_or_fetch_draft_redaction(): void
    {
        $draft = $this->readyDraft();
        $this->staff('cititor')->patchJson('/api/drafts/'.$draft->id.'/editor/redaction-marks', [])->assertForbidden();
        $this->getJson('/api/drafts/'.$draft->id.'/editor/redaction-preview')->assertForbidden();
        $this->getJson('/api/drafts/'.$draft->id.'/editor/pages/1/image')->assertForbidden();
    }

    public function test_staff_page_image_uses_renderer_dimensions_and_is_private(): void
    {
        Storage::fake('documents');
        Config::set('filesystems.default_document_disk', 'documents');
        $sourcePath = base_path('tests/Fixtures/rendering/mark.pdf');
        Storage::disk('documents')->put('private/source.pdf', file_get_contents($sourcePath));
        $draft = $this->readyDraft();
        $work = sys_get_temp_dir().'/draft-pages-'.Str::uuid();
        $rendered = (new DocumentPageRenderer)->render($sourcePath, $work);
        DB::table('ocr_pages')->where('extraction', $draft->ocr_extraction_id)->update(['width' => $rendered[0]['width'], 'height' => $rendered[0]['height']]);
        \Illuminate\Support\Facades\File::deleteDirectory($work);
        $response = $this->staff()->get('/api/drafts/'.$draft->id.'/editor/pages/1/image')->assertOk();
        self::assertSame('image/png', $response->headers->get('content-type'));
        self::assertStringContainsString('private', $response->headers->get('cache-control'));
        self::assertStringContainsString('no-store', $response->headers->get('cache-control'));
        self::assertStringContainsString('max-age=0', $response->headers->get('cache-control'));
        self::assertStringStartsWith("\x89PNG\r\n\x1a\n", $response->streamedContent());
        self::assertDatabaseHas('draft_access_events', ['draft_id' => $draft->id, 'event' => 'editor_page_image_viewed']);
    }

    public function test_three_jpg_collection_keeps_page_geometry_in_original_and_redacted_previews(): void
    {
        Storage::fake('documents');
        Config::set('filesystems.default_document_disk', 'documents');
        $work = sys_get_temp_dir().'/image-collection-'.Str::uuid();
        mkdir($work, 0700);
        $jpeg = "$work/page.jpg";
        $sourceImage = imagecreatetruecolor(100, 50);
        $white = imagecolorallocate($sourceImage, 255, 255, 255);
        imagefill($sourceImage, 0, 0, $white);
        imagejpeg($sourceImage, $jpeg, 100);
        imagedestroy($sourceImage);
        try {
            $keys = [];
            for ($page = 1; $page <= 3; $page++) {
                $key = "private/images/page-$page.jpg";
                Storage::disk('documents')->put($key, file_get_contents($jpeg));
                $keys[] = $key;
            }
            $draft = DocumentDraft::query()->create([
                'id' => (string) Str::uuid(), 'source_format' => 'image_collection',
                'original_storage_keys' => $keys, 'status' => 'review_ready',
            ]);
            $extraction = (string) Str::uuid();
            for ($page = 1; $page <= 3; $page++) {
                DB::table('ocr_pages')->insert([
                    'extraction' => $extraction, 'source_sha256' => str_repeat((string) $page, 64), 'page' => $page,
                    'width' => 100, 'height' => 50, 'text' => '', 'tsv' => '', 'words' => '[]',
                ]);
            }
            $draft->ocr_extraction_id = $extraction;
            $draft->save();

            $editor = $this->staff()->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk();
            $imageResponse = $this->get('/api/drafts/'.$draft->id.'/editor/pages/3/image')->assertOk();
            $pageImage = imagecreatefromstring($imageResponse->streamedContent());
            self::assertSame([100, 50], [imagesx($pageImage), imagesy($pageImage)]);
            imagedestroy($pageImage);

            $this->patchJson('/api/drafts/'.$draft->id.'/editor/redaction-marks', [
                'ocr_revision' => $editor->json('ocr_revision'), 'detection_revision' => $editor->json('detection_revision'),
                'marks' => [['page' => 3, 'box' => ['left' => 20, 'top' => 10, 'width' => 20, 'height' => 10]]],
            ])->assertOk();
            $this->postJson('/api/drafts/'.$draft->id.'/editor/redaction-preview')->assertOk();
            $pdf = "$work/redacted.pdf";
            file_put_contents($pdf, $this->get('/api/drafts/'.$draft->id.'/editor/redaction-preview')->assertOk()->streamedContent());
            $rendered = (new DocumentPageRenderer)->render($pdf, "$work/rendered");
            self::assertCount(3, $rendered);
            self::assertSame([100, 50], [$rendered[2]['width'], $rendered[2]['height']]);
            $redactedPage = imagecreatefrompng($rendered[2]['path']);
            self::assertSame(0, imagecolorat($redactedPage, 25, 15) & 0xffffff);
            self::assertNotSame(0, imagecolorat($redactedPage, 5, 5) & 0xffffff);
            imagedestroy($redactedPage);
        } finally {
            \Illuminate\Support\Facades\File::deleteDirectory($work);
        }
    }

    public function test_redaction_generation_publishes_a_private_image_only_derivative(): void
    {
        Storage::fake('documents');
        Config::set('filesystems.default_document_disk', 'documents');
        $sourcePath = base_path('tests/Fixtures/rendering/mark.pdf');
        Storage::disk('documents')->put('private/source.pdf', file_get_contents($sourcePath));
        $draft = $this->readyDraft();
        $work = sys_get_temp_dir().'/draft-pages-'.Str::uuid();
        $rendered = (new DocumentPageRenderer)->render($sourcePath, $work);
        DB::table('ocr_pages')->where('extraction', $draft->ocr_extraction_id)->update(['width' => $rendered[0]['width'], 'height' => $rendered[0]['height']]);
        \Illuminate\Support\Facades\File::deleteDirectory($work);
        $this->staff()->getJson('/api/drafts/'.$draft->id.'/editor')->assertOk();
        $this->patchJson('/api/drafts/'.$draft->id.'/editor/redaction-marks', [
            'ocr_revision' => 1, 'detection_revision' => 1,
            'marks' => [['page' => 1, 'box' => ['left' => 1, 'top' => 1, 'width' => 20, 'height' => 20]]],
        ])->assertOk();
        $record = $draft->fresh();
        $candidates = $record->pii_candidates;
        $candidates[0]['review_status'] = 'accepted';
        $candidates[0]['location_status'] = 'manual_review_required';
        $candidates[0]['bounding_boxes'] = [];
        $record->pii_candidates = $candidates;
        $record->save();
        $this->postJson('/api/drafts/'.$draft->id.'/editor/redaction-preview')->assertOk();
        $key = $draft->fresh()->redacted_pdf_storage_key;
        self::assertNotNull($key);
        self::assertTrue(Storage::disk('documents')->exists($key));
        self::assertSame('application/pdf', $this->get('/api/drafts/'.$draft->id.'/editor/redaction-preview')->headers->get('content-type'));
        self::assertDatabaseHas('draft_access_events', ['draft_id' => $draft->id, 'event' => 'redaction_pdf_generated']);
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
