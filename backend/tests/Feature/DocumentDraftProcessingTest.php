<?php

namespace Tests\Feature;

use App\Jobs\ProcessDocumentDraft;
use App\Models\DocumentDraft;
use App\Models\User;
use App\Services\DocumentDraftProcessor;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

final class DocumentDraftProcessingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
    }

    public function test_successful_job_links_one_extraction_and_marks_draft_review_ready(): void
    {
        $draft = $this->draft();
        $this->mock(DocumentDraftProcessor::class)
            ->shouldReceive('process')->once()->withArgs(fn (DocumentDraft $value) => $value->is($draft))
            ->andReturn('7f2e58a6-31f8-48ac-9ce3-1eb2c79ec58a');

        (new ProcessDocumentDraft($draft->id))->handle(app(DocumentDraftProcessor::class));

        $draft->refresh();
        self::assertSame('review_ready', $draft->status);
        self::assertSame('7f2e58a6-31f8-48ac-9ce3-1eb2c79ec58a', $draft->ocr_extraction_id);
    }

    public function test_processing_failure_is_retryable_and_final_failure_quarantines_draft(): void
    {
        $draft = $this->draft();
        $this->mock(DocumentDraftProcessor::class)
            ->shouldReceive('process')->once()->andThrow(new RuntimeException('OCR failed'));

        try {
            (new ProcessDocumentDraft($draft->id))->handle(app(DocumentDraftProcessor::class));
            self::fail('The job should rethrow processing failures for Laravel retries.');
        } catch (RuntimeException $exception) {
            self::assertSame('OCR failed', $exception->getMessage());
        }

        self::assertSame('failed', $draft->fresh()->status);
        $arhivar = $this->user('arhivar');
        $admin = $this->user('admin');
        $initialNotifications = DB::table('notifications')->count();
        $arhivarCount = User::query()->where('role', 'arhivar')->count();
        $job = new ProcessDocumentDraft($draft->id);
        self::assertSame(4, $job->tries);
        $job->failed(new RuntimeException('OCR failed'));
        self::assertSame('quarantined', $draft->fresh()->status);
        $notification = DB::table('notifications')->where('notifiable_id', $arhivar->id)
            ->where('data', 'like', '%'.$draft->id.'%')->first();
        self::assertNotNull($notification);
        self::assertSame($draft->id, json_decode($notification->data, true, flags: JSON_THROW_ON_ERROR)['draft_id']);
        self::assertSame($initialNotifications + $arhivarCount, DB::table('notifications')->count());
        self::assertSame(0, DB::table('notifications')->where('notifiable_id', $admin->id)->count());
    }

    public function test_intake_dispatches_one_job_for_each_persisted_draft(): void
    {
        Queue::fake();
        $user = User::query()->create([
            'name' => 'Draft Test User',
            'email' => 'draft-'.bin2hex(random_bytes(6)).'@example.test',
            'username' => 'draft_'.bin2hex(random_bytes(6)),
            'password' => 'test-password',
            'role' => 'admin',
        ]);

        $response = $this->actingAs($user, 'web')->post('/api/drafts', [
            'documents' => [
                new \Illuminate\Http\UploadedFile(__DIR__.'/../Fixtures/rendering/mark.pdf', 'act.pdf', 'application/pdf', UPLOAD_ERR_OK, true),
            ],
        ]);

        $response->assertOk()->assertJsonPath('items.0.status', 'queued');
        Queue::assertPushed(ProcessDocumentDraft::class, 1);
    }

    private function draft(): DocumentDraft
    {
        return DocumentDraft::query()->create([
            'id' => (string) Str::uuid(),
            'source_format' => 'pdf',
            'original_storage_keys' => ['drafts/test/original.pdf'],
            'status' => 'queued',
        ]);
    }

    private function user(string $role): User
    {
        return User::query()->create([
            'name' => 'Draft Test User',
            'email' => 'draft-'.bin2hex(random_bytes(6)).'@example.test',
            'username' => 'draft_'.bin2hex(random_bytes(6)),
            'password' => 'test-password',
            'role' => $role,
        ]);
    }
}
