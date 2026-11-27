<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['id', 'source_format', 'original_storage_keys', 'original_names', 'document_sha256', 'image_sha256s', 'derived_pdf_storage_key', 'redaction_marks', 'redaction_excluded_candidate_ids', 'redacted_pdf_storage_key', 'redaction_ocr_revision', 'redaction_detection_revision', 'ocr_extraction_id', 'metadata_suggestions', 'metadata', 'metadata_confirmed_at', 'metadata_revision', 'metadata_confirmed_revision', 'metadata_confirmed_ocr_revision', 'review_snapshot', 'nomenclature_entry_id', 'corrected_ocr', 'ocr_revision', 'detection_status', 'detection_revision', 'pii_candidates', 'status'])]
class DocumentDraft extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'original_storage_keys' => 'array',
            'original_names' => 'array',
            'image_sha256s' => 'array',
            'metadata_suggestions' => 'array',
            'metadata' => 'array',
            'review_snapshot' => 'array',
            'metadata_confirmed_at' => 'immutable_datetime',
            'corrected_ocr' => 'array',
            'pii_candidates' => 'array',
            'redaction_marks' => 'array',
            'redaction_excluded_candidate_ids' => 'array',
            'ocr_revision' => 'integer',
            'detection_revision' => 'integer',
            'metadata_revision' => 'integer',
            'metadata_confirmed_revision' => 'integer',
            'metadata_confirmed_ocr_revision' => 'integer',
        ];
    }

    public function nomenclatureEntry(): BelongsTo
    {
        return $this->belongsTo(NomenclatureEntry::class);
    }
}
