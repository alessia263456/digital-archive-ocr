<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ProtectedDraftOcrTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32))]);
        config(['filesystems.default_document_disk' => 'documents']);
        config(['filesystems.disks.documents' => ['driver' => 'local', 'root' => sys_get_temp_dir().'/protected-drafts', 'visibility' => 'private']]);
        Storage::fake('documents');
    }

    public function test_staff_can_read_persisted_ocr_pages_and_word_confidence(): void
    {
        $draft = $this->readyDraft();

        $this->asRole('arhivar')->getJson('/api/drafts/'.$draft->id.'/ocr')
            ->assertOk()
            ->assertJsonPath('id', $draft->id)
            ->assertJsonPath('status', 'review_ready')
            ->assertJsonPath('pages.0.page', 1)
            ->assertJsonPath('pages.0.text', 'Știință în România')
            ->assertJsonPath('pages.0.words.0.confidence', 96.5)
            ->assertJsonPath('pages.0.words.0.left', 10);
    }

    public function test_preview_records_access_and_returns_a_five_minute_signed_url(): void
    {
        Carbon::setTestNow('2026-11-25 10:00:00');
        $draft = $this->readyDraft();
        $staff = $this->asRole('admin');
        $response = $staff->postJson('/api/drafts/'.$draft->id.'/preview');

        $response->assertOk()->assertJsonStructure(['url', 'expires_at']);
        $this->assertDatabaseHas('draft_access_events', [
            'draft_id' => $draft->id,
            'user_id' => auth('web')->id(),
            'event' => 'preview_issued',
        ]);
        self::assertSame(now()->addMinutes(5)->toIso8601String(), $response->json('expires_at'));
        $url = $response->json('url');
        self::assertStringNotContainsString('drafts/source.pdf', $url);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        self::assertSame((string) now()->addMinutes(5)->timestamp, $query['expires']);
        $this->get($url)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        Carbon::setTestNow();
    }

    public function test_access_event_is_persisted_before_signed_url_creation(): void
    {
        $draft = $this->readyDraft();
        URL::shouldReceive('temporarySignedRoute')->once()->andThrow(new \RuntimeException('Synthetic signing failure.'));

        $this->asRole('admin')->postJson('/api/drafts/'.$draft->id.'/preview')->assertServerError();

        $this->assertDatabaseHas('draft_access_events', [
            'draft_id' => $draft->id,
            'event' => 'preview_issued',
        ]);
    }

    public function test_image_collection_preview_includes_every_ordered_page_without_storage_paths(): void
    {
        $draft = $this->readyDraft();
        $draft->source_format = 'image_collection';
        $draft->original_storage_keys = ['drafts/pages/one.png', 'drafts/pages/two.jpg'];
        $draft->save();
        Storage::disk('documents')->put('drafts/pages/one.png', 'page one');
        Storage::disk('documents')->put('drafts/pages/two.jpg', 'page two');

        $response = $this->asRole('admin')->postJson('/api/drafts/'.$draft->id.'/preview')->assertOk();

        $response->assertJsonPath('pages.0.page', 1)
            ->assertJsonPath('pages.0.kind', 'image')
            ->assertJsonPath('pages.1.page', 2)
            ->assertJsonPath('pages.1.kind', 'image');
        self::assertStringNotContainsString('drafts/pages/', $response->getContent());
    }

    public function test_cititor_and_anonymous_callers_cannot_read_or_issue_previews(): void
    {
        $draft = $this->readyDraft();
        $this->asRole('cititor')->getJson('/api/drafts/'.$draft->id.'/ocr')->assertForbidden();
        $this->asRole('cititor')->postJson('/api/drafts/'.$draft->id.'/preview')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/drafts/'.$draft->id.'/ocr')->assertUnauthorized();
        $this->postJson('/api/drafts/'.$draft->id.'/preview')->assertUnauthorized();
        self::assertSame(0, DB::table('draft_access_events')->where('draft_id', $draft->id)->count());
    }

    public function test_unknown_not_ready_and_unpreviewable_drafts_return_safe_errors(): void
    {
        $this->asRole('admin')->getJson('/api/drafts/'.Str::uuid().'/ocr')
            ->assertNotFound()->assertJsonPath('eroare', 'Ciorna solicitată nu a fost găsită.');
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(), 'source_format' => 'pdf',
            'original_storage_keys' => ['drafts/missing.pdf'], 'status' => 'queued',
        ]);
        $this->getJson('/api/drafts/'.$draft->id.'/ocr')->assertStatus(409)
            ->assertJsonPath('eroare', 'Rezultatele OCR nu sunt încă disponibile. Actualizați starea și încercați din nou.');
        $this->postJson('/api/drafts/'.$draft->id.'/preview')->assertStatus(409)
            ->assertJsonPath('eroare', 'Previzualizarea documentului nu este disponibilă.');
        self::assertStringNotContainsString('drafts/missing.pdf', $this->getJson('/api/drafts/'.$draft->id.'/ocr')->getContent());
    }

    private function readyDraft(): DocumentDraft
    {
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(), 'source_format' => 'pdf',
            'original_storage_keys' => ['drafts/source.pdf'], 'status' => 'review_ready',
        ]);
        Storage::disk('documents')->put('drafts/source.pdf', '%PDF-1.4 protected source');
        $extraction = (string) Str::uuid();
        DB::table('ocr_pages')->insert([
            'extraction' => $extraction, 'source_sha256' => str_repeat('a', 64), 'page' => 1,
            'width' => 100, 'height' => 200, 'text' => 'Știință în România', 'tsv' => 'private TSV',
            'words' => json_encode([['text' => 'Știință', 'confidence' => 96.5, 'left' => 10, 'top' => 20, 'width' => 30, 'height' => 10]], JSON_THROW_ON_ERROR),
        ]);
        $draft->ocr_extraction_id = $extraction;
        $draft->save();
        return $draft;
    }

    private function asRole(string $role): self
    {
        $user = User::query()->create([
            'name' => 'Protected Draft User', 'email' => 'protected-'.bin2hex(random_bytes(5)).'@example.test',
            'username' => 'protected_'.bin2hex(random_bytes(5)), 'password' => 'test-password', 'role' => $role,
        ]);
        $this->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
        $this->actingAs($user, 'web');
        return $this;
    }
}
