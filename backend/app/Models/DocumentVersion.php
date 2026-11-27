<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['id', 'document_id', 'version_number', 'source_storage_keys', 'source_sha256', 'image_sha256s', 'redacted_pdf_storage_key', 'redacted_sha256', 'metadata', 'nomenclature_entry_id', 'retention_status', 'retention_base_date', 'first_eligible_date', 'approved_by', 'approved_at'])]
final class DocumentVersion extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'source_storage_keys' => 'array', 'image_sha256s' => 'array', 'metadata' => 'array',
            'retention_base_date' => 'date:Y-m-d', 'first_eligible_date' => 'date:Y-m-d', 'approved_at' => 'immutable_datetime',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
