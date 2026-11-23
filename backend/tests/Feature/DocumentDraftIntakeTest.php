<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DocumentDraftIntakeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('documents');
        config(['filesystems.default_document_disk' => 'documents']);
        $this->artisan('migrate')->assertExitCode(0);
    }

    public function test_mixed_intake_persists_independent_document_and_ordered_image_drafts(): void
    {
        $user = $this->user('arhivar');
        $response = $this->actingAs($user, 'sanctum')->post('/api/drafts', [
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
        self::assertSame(3, DocumentDraft::query()->count());
        $pdf = DocumentDraft::query()->where('source_format', 'pdf')->firstOrFail();
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/rendering/mark.pdf'), Storage::disk('documents')->get($pdf->original_storage_keys[0]));
        $docx = DocumentDraft::query()->where('source_format', 'docx')->firstOrFail();
        self::assertNotNull($docx->derived_pdf_storage_key);
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/conversion/two-pages.docx'), Storage::disk('documents')->get($docx->original_storage_keys[0]));
        self::assertTrue(Storage::disk('documents')->exists($docx->derived_pdf_storage_key));
        $imageDraft = DocumentDraft::query()->where('source_format', 'image_collection')->firstOrFail();
        self::assertCount(2, $imageDraft->original_storage_keys);
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/rendering/romanian.png'), Storage::disk('documents')->get($imageDraft->original_storage_keys[0]));
        self::assertSame(file_get_contents(__DIR__.'/../Fixtures/rendering/romanian.jpg'), Storage::disk('documents')->get($imageDraft->original_storage_keys[1]));
        self::assertCount(5, Storage::disk('documents')->allFiles('drafts'));
    }

    public function test_invalid_document_item_does_not_discard_valid_siblings(): void
    {
        $user = $this->user('admin');
        $initialDraftCount = DocumentDraft::query()->count();
        $response = $this->actingAs($user, 'sanctum')->post('/api/drafts', [
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
            $response = $this->actingAs($this->user($role), 'sanctum')
                ->getJson('/api/drafts/'.$draft->id)->assertOk()
                ->assertJsonPath('id', $draft->id)->assertJsonPath('status', 'processing')
                ->assertExactJson(['id' => $draft->id, 'status' => 'processing']);

            self::assertSame(['id', 'status'], array_keys($response->json()));
        }
    }

    public function test_resume_returns_romanian_not_found_for_a_missing_draft(): void
    {
        $this->actingAs($this->user('admin'), 'sanctum')
            ->getJson('/api/drafts/'.Str::uuid())
            ->assertNotFound()
            ->assertExactJson(['eroare' => 'Ciorna solicitată nu a fost găsită.']);
    }

    public function test_anonymous_and_cititor_users_cannot_access_drafts(): void
    {
        $this->getJson('/api/drafts/1')->assertUnauthorized();
        $this->actingAs($this->user('cititor'), 'sanctum')->getJson('/api/drafts/1')->assertForbidden();
        $this->actingAs($this->user('cititor'), 'sanctum')->postJson('/api/drafts', [])->assertForbidden();
        $this->actingAs($this->user('admin'), 'sanctum')->post('/api/drafts', [
            'documents' => [$this->upload('Fixtures/rendering/mark.pdf', 'valid.pdf', 'application/pdf')],
        ])->assertOk()->assertJsonPath('items.0.status', 'queued');
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
