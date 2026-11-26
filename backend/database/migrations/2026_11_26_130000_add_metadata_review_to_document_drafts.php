<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->json('metadata_suggestions')->nullable();
            $table->json('metadata')->nullable();
            $table->timestampTz('metadata_confirmed_at')->nullable();
            $table->foreignId('nomenclature_entry_id')->nullable()
                ->constrained('nomenclature_entries')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('nomenclature_entry_id');
            $table->dropColumn(['metadata_suggestions', 'metadata']);
        });
    }
};
