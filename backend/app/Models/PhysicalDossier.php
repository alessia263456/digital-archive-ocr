<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['physical_dossier_number'])]
class PhysicalDossier extends Model
{
    public $timestamps = false;
}
