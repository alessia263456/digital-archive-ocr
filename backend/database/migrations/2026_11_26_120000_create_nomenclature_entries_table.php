<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nomenclature_entries', function (Blueprint $table) {
            $table->id();
            $table->string('document_type');
            $table->text('subtype');
            $table->string('storage_context');
            $table->string('archival_indicator');
            $table->string('retention_term', 32);
            $table->smallInteger('retention_years')->nullable();
            $table->boolean('cs_flag')->default(false);
            $table->string('retention_computation_base');
            $table->text('source_rule');
            $table->timestamps();

            $table->unique(
                ['document_type', 'subtype', 'storage_context'],
                'nomenclature_classification_unique'
            );
            $table->index('archival_indicator');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nomenclature_entries');
    }
};
