<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['physical_dossier_number', 'archival_indicator', 'inventory_number', 'retention_time', 'description'])]
class PhysicalDossier extends Model
{
    public $timestamps = false;
}
