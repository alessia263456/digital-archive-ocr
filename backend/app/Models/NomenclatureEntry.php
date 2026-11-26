<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'document_type',
    'subtype',
    'storage_context',
    'archival_indicator',
    'retention_term',
    'retention_years',
    'cs_flag',
    'retention_computation_base',
    'source_rule',
])]
class NomenclatureEntry extends Model
{
    protected function casts(): array
    {
        return [
            'retention_years' => 'integer',
            'cs_flag' => 'boolean',
        ];
    }
}
