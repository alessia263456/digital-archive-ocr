<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentDraft;
use App\Models\DocumentVersion;
use Illuminate\Support\Facades\DB;

final class ArchiveSearchIndexer
{
    public function reindex(DocumentDraft $draft, Document $document, DocumentVersion $version): void
    {
        $rows = DB::table('ocr_pages')->where('extraction', $draft->ocr_extraction_id)->orderBy('page')->get();
        if ($rows->isEmpty()) throw new \RuntimeException('Nu există OCR aprobat pentru indexare.');

        $corrected = collect($draft->corrected_ocr ?? [])->keyBy('page');
        $pages = $rows->map(function (object $row) use ($corrected): array {
            $fix = $corrected->get((int) $row->page);
            return [
                'page' => (int) $row->page,
                'width' => (int) $row->width,
                'height' => (int) $row->height,
                'text' => (string) ($fix['text'] ?? $row->text),
                'source_text' => (string) $row->text,
                'base_text' => (string) ($fix['base_text'] ?? $fix['text'] ?? $row->text),
                'operations' => $fix['operations'] ?? [],
                'words' => json_decode($row->words, true, flags: JSON_THROW_ON_ERROR),
            ];
        })->all();

        $metadata = $document->metadata ?? $draft->metadata ?? [];
        $projection = app(ReaderRedactionProjection::class)->project(
            $pages, $draft->pii_candidates ?? [], $draft->redaction_marks ?? [], $metadata,
            $draft->redaction_excluded_candidate_ids ?? [],
        );
        $readerMetadata = $projection['metadata'];
        unset($readerMetadata['tags'], $readerMetadata['physical_dossier_id']);
        $staffText = implode("\n", array_merge(
            array_column($pages, 'text'),
            $this->scalarValues($metadata),
        ));
        $readerText = implode("\n", array_merge(
            array_column($projection['pages'], 'text'),
            $this->scalarValues($readerMetadata),
        ));
        $entry = DB::table('nomenclature_entries')->where('id', $document->nomenclature_entry_id)->first();
        if (!$entry) throw new \RuntimeException('Clasificarea documentului nu există.');

        DB::table('archive_search_documents')->updateOrInsert(
            ['document_id' => $document->id],
            [
                'version_id' => $version->id,
                'physical_dossier_id' => $document->physical_dossier_id,
                'nomenclature_entry_id' => $document->nomenclature_entry_id,
                'staff_metadata' => json_encode($metadata, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'reader_metadata' => json_encode($readerMetadata, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                'staff_text' => $staffText,
                'reader_text' => $readerText,
                'document_type' => $entry->document_type,
                'act_date' => $metadata['act_date'] ?? null,
                'approved_at' => $version->approved_at,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    private function scalarValues(array $values): array
    {
        $result = [];
        array_walk_recursive($values, static function (mixed $value) use (&$result): void {
            if (is_string($value) || is_int($value) || is_float($value)) $result[] = (string) $value;
        });
        return $result;
    }
}
