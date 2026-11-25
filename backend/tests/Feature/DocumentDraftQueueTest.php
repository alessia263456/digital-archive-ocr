<?php

namespace Tests\Feature;

use App\Jobs\ProcessDocumentDraft;
use App\Models\DocumentDraft;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DocumentDraftQueueTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
        DB::table('draft_access_events')->delete();
        DocumentDraft::query()->delete();
        Storage::fake('documents');
        config(['filesystems.default_document_disk' => 'documents']);
        $this->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
    }

    public function test_queue_lists_only_review_ready_and_active_quarantined_drafts_with_original_names(): void
    {
        $review = $this->draft('review_ready', 'contract-original.pdf');
        $quarantined = $this->draft('quarantined', 'broken-original.pdf');
        $this->draft('failed_permanently', 'finished.pdf');
        $this->draft('processing', 'processing.pdf');

        $this->actingAs($this->user('arhivar'), 'web')->getJson('/api/drafts/queue')
            ->assertOk()->assertJsonPath('review.0.id', $review->id)
            ->assertJsonPath('review.0.name', 'contract-original.pdf')
            ->assertJsonPath('quarantine.0.id', $quarantined->id)
            ->assertJsonPath('quarantine.0.name', 'broken-original.pdf')
            ->assertJsonCount(1, 'review')->assertJsonCount(1, 'quarantine');
    }

    public function test_retry_is_conditional_dispatches_one_job_and_audits_actor(): void
    {
        Queue::fake();
        $draft = $this->draft('quarantined', 'broken.pdf');
        Storage::disk('documents')->put('drafts/test/original.pdf', 'synthetic private source');
        $user = $this->user('admin');

        $this->actingAs($user, 'web')->postJson('/api/drafts/'.$draft->id.'/retry')
            ->assertOk()->assertJsonPath('status', 'queued');
        $this->postJson('/api/drafts/'.$draft->id.'/retry')->assertStatus(409)
            ->assertExactJson(['eroare' => 'Documentul nu mai este în carantină. Reîncărcați coada.']);

        self::assertSame('queued', $draft->fresh()->status);
        Queue::assertPushed(ProcessDocumentDraft::class, 1);
        self::assertDatabaseHas('draft_access_events', [
            'draft_id' => $draft->id,
            'user_id' => $user->id,
            'event' => 'retry_requested',
        ]);
        self::assertSame(1, DB::table('draft_access_events')->where('draft_id', $draft->id)->count());
    }

    public function test_permanent_failure_is_terminal_audited_and_removed_from_active_queue_without_deletion(): void
    {
        $draft = $this->draft('quarantined', 'broken.pdf');
        Storage::disk('documents')->put('drafts/test/original.pdf', 'synthetic private source');
        $user = $this->user('arhivar');

        $this->actingAs($user, 'web')->postJson('/api/drafts/'.$draft->id.'/permanent-failure')
            ->assertOk()->assertJsonPath('status', 'failed_permanently');
        $this->postJson('/api/drafts/'.$draft->id.'/permanent-failure')->assertStatus(409);

        self::assertSame('failed_permanently', $draft->fresh()->status);
        self::assertDatabaseHas('document_drafts', ['id' => $draft->id]);
        self::assertTrue(Storage::disk('documents')->exists('drafts/test/original.pdf'));
        self::assertDatabaseHas('draft_access_events', [
            'draft_id' => $draft->id,
            'user_id' => $user->id,
            'event' => 'permanently_failed',
        ]);
        $this->getJson('/api/drafts/queue')->assertOk()->assertJsonCount(0, 'quarantine');
    }

    public function test_reader_and_anonymous_users_cannot_read_or_change_the_queue(): void
    {
        $draft = $this->draft('quarantined', 'broken.pdf');
        $this->getJson('/api/drafts/queue')->assertUnauthorized();
        $this->actingAs($this->user('cititor'), 'web')->getJson('/api/drafts/queue')->assertForbidden();
        $this->postJson('/api/drafts/'.$draft->id.'/retry')->assertForbidden();
    }

    private function draft(string $status, string $name): DocumentDraft
    {
        return DocumentDraft::query()->create([
            'id' => (string) Str::uuid(),
            'source_format' => 'pdf',
            'original_storage_keys' => ['drafts/test/original.pdf'],
            'original_names' => [$name],
            'document_sha256' => hash('sha256', $name),
            'status' => $status,
        ]);
    }

    private function user(string $role): User
    {
        return User::query()->create([
            'name' => 'Queue Test User',
            'email' => 'queue-'.bin2hex(random_bytes(6)).'@example.test',
            'username' => 'queue_'.bin2hex(random_bytes(6)),
            'password' => 'test-password',
            'role' => $role,
        ]);
    }
}
