<?php

namespace Tests\Feature;

use App\Models\DocumentDraft;
use App\Services\DocumentDuplicateChecker;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class DocumentDuplicateCheckerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate')->assertExitCode(0);
        DB::table('draft_access_events')->delete();
        DocumentDraft::query()->delete();
    }

    public function test_reports_a_persisted_exact_fingerprint(): void
    {
        $draft = $this->draft('pdf', 'a'.str_repeat('0', 63));

        $matches = app(DocumentDuplicateChecker::class)->check($draft->document_sha256);

        self::assertSame(['id' => $draft->id, 'source_format' => 'pdf'], $matches['exact']);
        self::assertSame([], $matches['reordered_images']);
    }

    public function test_reports_reordered_multisets_but_not_a_shared_page_as_exact(): void
    {
        $pages = ['b'.str_repeat('0', 63), 'c'.str_repeat('0', 63)];
        $draft = $this->draft('image_collection', 'd'.str_repeat('0', 63), $pages);

        $matches = app(DocumentDuplicateChecker::class)->check('e'.str_repeat('0', 63), array_reverse($pages));

        self::assertNull($matches['exact']);
        self::assertSame([['id' => $draft->id, 'source_format' => 'image_collection']], $matches['reordered_images']);
        self::assertNull(app(DocumentDuplicateChecker::class)
            ->check('f'.str_repeat('0', 63), [$pages[0]])['exact']);
    }

    public function test_reordered_image_warning_preserves_page_multiplicity(): void
    {
        $repeated = 'a'.str_repeat('0', 63);
        $other = 'b'.str_repeat('0', 63);
        $draft = $this->draft('image_collection', 'c'.str_repeat('0', 63), [$repeated, $repeated, $other]);

        $sameMultiset = app(DocumentDuplicateChecker::class)->check('d'.str_repeat('0', 63), [$other, $repeated, $repeated]);
        $differentMultiset = app(DocumentDuplicateChecker::class)->check('e'.str_repeat('0', 63), [$other, $repeated]);

        self::assertSame([['id' => $draft->id, 'source_format' => 'image_collection']], $sameMultiset['reordered_images']);
        self::assertSame([], $differentMultiset['reordered_images']);
    }

    private function draft(string $format, string $digest, ?array $pages = null): DocumentDraft
    {
        return DocumentDraft::query()->create([
            'id' => (string) Str::uuid(),
            'source_format' => $format,
            'original_storage_keys' => ['drafts/test/original'],
            'document_sha256' => $digest,
            'image_sha256s' => $pages,
            'status' => 'review_ready',
        ]);
    }
}
