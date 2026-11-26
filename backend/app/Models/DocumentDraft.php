<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['id', 'source_format', 'original_storage_keys', 'original_names', 'document_sha256', 'image_sha256s', 'derived_pdf_storage_key', 'ocr_extraction_id', 'metadata_suggestions', 'metadata', 'metadata_confirmed_at', 'nomenclature_entry_id', 'corrected_ocr', 'ocr_revision', 'detection_status', 'detection_revision', 'pii_candidates', 'status'])]
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
            'metadata_confirmed_at' => 'immutable_datetime',
            'corrected_ocr' => 'array',
            'pii_candidates' => 'array',
            'ocr_revision' => 'integer',
            'detection_revision' => 'integer',
        ];
    }

    public function nomenclatureEntry(): BelongsTo
    {
        return $this->belongsTo(NomenclatureEntry::class);
    }
}
