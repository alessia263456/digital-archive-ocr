<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\User;
use App\Jobs\ProcessDocumentDraft;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DocumentDraftIntakeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('documents');
        Queue::fake();
        config(['filesystems.default_document_disk' => 'documents']);
        $this->withSession([
            'authentication_started_at' => now()->timestamp,
            'authentication_last_activity_at' => now()->timestamp,
        ]);
        $this->artisan('migrate')->assertExitCode(0);
    }

    public function test_mixed_intake_persists_independent_document_and_ordered_image_drafts(): void
    {
        $user = $this->user('arhivar');
        $initialDraftCount = DocumentDraft::query()->count();
        $response = $this->actingAs($user, 'web')->post('/api/drafts', [
            'documents' => [
                $this->upload('Fixtures/rendering/mark.pdf', 'act.pdf', 'application/pdf'),
                $this->upload('Fixtures/conversion/two-pages.docx', 'act.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            ],
            'images' => [
                $this->upload('Fixtures/rendering/romanian.png', 'page-1.png', 'image/png'),
                $this->upload('Fixtures/rendering/romanian.jpg', 'page-2.jpg', 'image/jpeg'),
            ],
        ]);

        $response->assertOk()->assertJsonCount(3, 'items')->assertJsonPath('items.0.status', 'queued')
            ->assertJsonPath('items.1.status', 'queued')->assertJsonPath('items.2.status', 'queued')
            ->assertJsonPath('items.0.group', 'documents')->assertJsonPath('items.0.index', 0)
            ->assertJsonPath('items.2.group', 'images');
        self::assertSame($initialDraftCount + 3, DocumentDraft::query()->count());
        $pdf = DocumentDraft::query()->findOrFail($response->json('items.0.id'));
        self::assertSame(hash_file('sha256', __DIR__.'/../Fixtures/rendering/mark.pdf'), $pdf->document_sha256);
        self::assertSame(['act.pdf'], $pdf->original_names);
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/rendering/mark.pdf'), Storage::disk('documents')->get($pdf->original_storage_keys[0]));
        $docx = DocumentDraft::query()->findOrFail($response->json('items.1.id'));
        self::assertSame(hash_file('sha256', __DIR__.'/../Fixtures/conversion/two-pages.docx'), $docx->document_sha256);
        self::assertNotNull($docx->derived_pdf_storage_key);
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/conversion/two-pages.docx'), Storage::disk('documents')->get($docx->original_storage_keys[0]));
        self::assertTrue(Storage::disk('documents')->exists($docx->derived_pdf_storage_key));
        $imageDraft = DocumentDraft::query()->findOrFail($response->json('items.2.id'));
        self::assertSame([
            hash_file('sha256', __DIR__.'/../Fixtures/rendering/romanian.png'),
            hash_file('sha256', __DIR__.'/../Fixtures/rendering/romanian.jpg'),
        ], $imageDraft->image_sha256s);
        self::assertSame(['page-1.png', 'page-2.jpg'], $imageDraft->original_names);
        self::assertSame(hash('sha256', pack('N', 2)
            .hex2bin($imageDraft->image_sha256s[0]).hex2bin($imageDraft->image_sha256s[1])), $imageDraft->document_sha256);
        self::assertCount(2, $imageDraft->original_storage_keys);
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/rendering/romanian.png'), Storage::disk('documents')->get($imageDraft->original_storage_keys[0]));
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/rendering/romanian.jpg'), Storage::disk('documents')->get($imageDraft->original_storage_keys[1]));
        self::assertCount(5, Storage::disk('documents')->allFiles('drafts'));
        Queue::assertPushed(ProcessDocumentDraft::class, 3);
    }

    public function test_reordering_images_changes_document_fingerprint_and_preserves_page_digests(): void
    {
        $user = $this->user('arhivar');
        $first = $this->actingAs($user, 'web')->post('/api/drafts', [
            'images' => [
                $this->upload('Fixtures/rendering/romanian.png', 'page-a.png', 'image/png'),
                $this->upload('Fixtures/rendering/romanian.jpg', 'page-b.jpg', 'image/jpeg'),
            ],
        ])->assertOk()->json('items.0.id');
        $second = $this->actingAs($user, 'web')->post('/api/drafts', [
            'images' => [
                $this->upload('Fixtures/rendering/romanian.jpg', 'page-b.jpg', 'image/jpeg'),
                $this->upload('Fixtures/rendering/romanian.png', 'page-a.png', 'image/png'),
            ],
        ])->assertOk()->json('items.0.id');

        $firstDraft = DocumentDraft::query()->findOrFail($first);
        $secondDraft = DocumentDraft::query()->findOrFail($second);
        self::assertNotSame($firstDraft->document_sha256, $secondDraft->document_sha256);
        $firstPages = $firstDraft->image_sha256s;
        $secondPages = $secondDraft->image_sha256s;
        sort($firstPages, SORT_STRING);
        sort($secondPages, SORT_STRING);
        self::assertSame($firstPages, $secondPages);
        self::assertSame(2, count($firstDraft->image_sha256s));
    }

    public function test_invalid_document_item_does_not_discard_valid_siblings(): void
    {
        $user = $this->user('admin');
        $initialDraftCount = DocumentDraft::query()->count();
        $response = $this->actingAs($user, 'web')->post('/api/drafts', [
            'documents' => [
                $this->upload('Fixtures/rendering/mark.pdf', 'valid.pdf', 'application/pdf'),
                UploadedFile::fake()->createWithContent('bad.txt', 'not a supported document'),
            ],
        ]);

        $response->assertOk()->assertJsonCount(2, 'items')->assertJsonPath('items.0.status', 'queued')
            ->assertJsonPath('items.1.status', 'invalid')->assertJsonPath('items.1.index', 1)
            ->assertJsonPath('items.1.error', 'Sunt acceptate doar documentele PDF și DOCX.');
        self::assertSame($initialDraftCount + 1, DocumentDraft::query()->count());
    }

    public function test_admin_and_arhivar_can_resume_any_draft_with_current_status_only(): void
    {
        $draft = DocumentDraft::query()->create([
            'id' => (string) Str::uuid(),
            'source_format' => 'pdf',
            'original_storage_keys' => ['drafts/private/original.pdf'],
            'status' => 'processing',
        ]);

        foreach (['admin', 'arhivar'] as $role) {
            $response = $this->actingAs($this->user($role), 'web')
                ->getJson('/api/drafts/'.$draft->id)->assertOk()
                ->assertJsonPath('id', $draft->id)->assertJsonPath('status', 'processing')
                ->assertExactJson(['id' => $draft->id, 'status' => 'processing']);

            self::assertSame(['id', 'status'], array_keys($response->json()));
        }
    }

    public function test_resume_returns_romanian_not_found_for_a_missing_draft(): void
    {
        $this->actingAs($this->user('admin'), 'web')
            ->getJson('/api/drafts/'.Str::uuid())
            ->assertNotFound()
            ->assertExactJson(['eroare' => 'Ciorna solicitată nu a fost găsită.']);
    }

    public function test_anonymous_and_cititor_users_cannot_access_drafts(): void
    {
        $this->getJson('/api/drafts/1')->assertUnauthorized();
        $this->actingAs($this->user('cititor'), 'web')->getJson('/api/drafts/1')->assertForbidden();
        $this->actingAs($this->user('cititor'), 'web')->postJson('/api/drafts', [])->assertForbidden();
        $this->actingAs($this->user('admin'), 'web')->post('/api/drafts', [
            'documents' => [$this->upload('Fixtures/rendering/mark.pdf', 'valid.pdf', 'application/pdf')],
        ])->assertOk()->assertJsonPath('items.0.status', 'queued');
    }

    public function test_recent_drafts_are_limited_ordered_and_expose_only_safe_summary_fields(): void
    {
        DB::beginTransaction();
        $this->beforeApplicationDestroyed(fn () => DB::rollBack());
        $statuses = ['queued', 'processing', 'failed', 'failed_permanently', 'quarantined', 'review_ready'];
        $expected = [];
        $created = now()->addDay()->startOfSecond();
        for ($index = 0; $index < 53; $index++) {
            $draft = new DocumentDraft([
                'id' => (string) Str::uuid(),
                'source_format' => 'pdf',
                'original_storage_keys' => ['drafts/private/001.pdf'],
                'original_names' => $index === 52 ? null : ["synthetic-{$index}.pdf"],
                'status' => $statuses[$index % count($statuses)],
            ]);
            $draft->created_at = $created->copy()->subSeconds(52 - $index);
            $draft->save();
            $expected[] = [
                'id' => $draft->id,
                'original_names' => $draft->original_names,
                'status' => $draft->status,
                'created_at' => $draft->created_at->toIso8601String(),
            ];
        }

        $this->getJson('/api/drafts/recent')->assertUnauthorized();
        $this->actingAs($this->user('cititor'), 'web')->getJson('/api/drafts/recent')->assertForbidden();
        foreach (['admin', 'arhivar'] as $role) {
            $this->actingAs($this->user($role), 'web')->getJson('/api/drafts/recent')->assertOk()
                ->assertExactJson(['drafts' => array_slice(array_reverse($expected), 0, 50)]);
        }
    }

    public function test_incomplete_document_batch_reports_request_error_and_keeps_known_outcomes(): void
    {
        $initialDraftCount = DocumentDraft::query()->count();
        $response = $this->actingAs($this->user('admin'), 'web')->post('/api/drafts', [
            'document_count' => '3',
            'documents' => [
                $this->upload('Fixtures/rendering/mark.pdf', 'valid.pdf', 'application/pdf'),
                new UploadedFile('', 'partial.pdf', 'application/pdf', UPLOAD_ERR_PARTIAL, true),
            ],
        ]);

        $response->assertUnprocessable()->assertJsonStructure(['eroare'])
            ->assertJsonCount(2, 'items')->assertJsonPath('items.0.status', 'queued')
            ->assertJsonPath('items.1.status', 'invalid')->assertJsonPath('items.1.index', 1);
        self::assertSame($initialDraftCount + 1, DocumentDraft::query()->count());
        Queue::assertPushed(ProcessDocumentDraft::class, 1);
    }

    public function test_an_incomplete_image_collection_never_creates_a_draft(): void
    {
        $initialDraftCount = DocumentDraft::query()->count();
        $this->actingAs($this->user('arhivar'), 'web');
        $validPage = $this->upload('Fixtures/rendering/romanian.png', 'page.png', 'image/png');
        $this->post('/api/drafts', ['image_count' => '2', 'images' => [$validPage]])
            ->assertUnprocessable()->assertJsonStructure(['eroare']);
        $this->post('/api/drafts', ['image_count' => '2', 'images' => [
            $validPage, new UploadedFile('', 'partial.png', 'image/png', UPLOAD_ERR_PARTIAL, true),
        ]])->assertOk()->assertJsonPath('items.0.status', 'invalid');
        $this->post('/api/drafts', ['images' => [1 => $validPage]])
            ->assertUnprocessable()->assertJsonStructure(['eroare']);
        self::assertSame($initialDraftCount, DocumentDraft::query()->count());
        Queue::assertNothingPushed();
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

    private function upload(string $path, string $name, string $mime): UploadedFile
    {
        return new UploadedFile(__DIR__.'/../'.$path, $name, $mime, UPLOAD_ERR_OK, true);
    }
}
