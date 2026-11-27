<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('physical_dossiers', function (Blueprint $table) {
            $table->string('archival_indicator', 64);
            $table->string('inventory_number', 255);
            $table->string('retention_time', 64);
            $table->string('description', 500)->nullable();
            $table->unique('physical_dossier_number', 'physical_dossiers_number_unique');
        });
    }

    public function down(): void
    {
        Schema::table('physical_dossiers', function (Blueprint $table) {
            $table->dropUnique('physical_dossiers_number_unique');
            $table->dropColumn(['archival_indicator', 'inventory_number', 'retention_time', 'description']);
        });
    }
};
