<?php

namespace App\Services;

use App\Models\DocumentDraft;

final class DocumentDuplicateChecker
{
    /** @param list<string> $imageDigests
     *  @return array{exact: array{id: string, source_format: string}|null, reordered_images: list<array{id: string, source_format: string}>}
     */
    public function check(string $documentDigest, array $imageDigests = [], ?string $exceptDraftId = null): array
    {
        $query = DocumentDraft::query()->when($exceptDraftId, fn ($query) => $query->whereKeyNot($exceptDraftId));
        $exact = $query->where('document_sha256', $documentDigest)->first(['id', 'source_format']);
        $reordered = [];

        if ($imageDigests !== []) {
            $candidatePages = $imageDigests;
            sort($candidatePages, SORT_STRING);
            $reordered = DocumentDraft::query()
                ->when($exceptDraftId, fn ($query) => $query->whereKeyNot($exceptDraftId))
                ->where('source_format', 'image_collection')
                ->where('document_sha256', '!=', $documentDigest)
                ->get(['id', 'source_format', 'image_sha256s'])
                ->filter(function (DocumentDraft $draft) use ($candidatePages): bool {
                    $pages = $draft->image_sha256s ?? [];
                    sort($pages, SORT_STRING);
                    return $pages === $candidatePages;
                })
                ->map(fn (DocumentDraft $draft) => ['id' => $draft->id, 'source_format' => $draft->source_format])
                ->values()->all();
        }

        return [
            'exact' => $exact ? ['id' => $exact->id, 'source_format' => $exact->source_format] : null,
            'reordered_images' => $reordered,
        ];
    }
}
