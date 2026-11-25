<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['id', 'source_format', 'original_storage_keys', 'original_names', 'document_sha256', 'image_sha256s', 'derived_pdf_storage_key', 'ocr_extraction_id', 'status'])]
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
        ];
    }
}
