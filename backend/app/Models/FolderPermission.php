<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['physical_dossier_id', 'principal_type', 'user_id', 'allowed'])]
final class FolderPermission extends Model
{
    protected function casts(): array
    {
        return ['allowed' => 'boolean'];
    }
}
