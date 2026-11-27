<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('folder_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('physical_dossier_id')->constrained('physical_dossiers')->cascadeOnDelete();
            $table->string('principal_type', 8);
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->boolean('allowed');
            $table->timestampsTz();
        });
        DB::statement("ALTER TABLE folder_permissions ADD CONSTRAINT folder_permissions_principal_check CHECK ((principal_type = 'role' AND user_id IS NULL) OR (principal_type = 'user' AND user_id IS NOT NULL))");
        DB::statement("CREATE UNIQUE INDEX folder_permissions_role_unique ON folder_permissions (physical_dossier_id, principal_type) WHERE user_id IS NULL");
        DB::statement("CREATE UNIQUE INDEX folder_permissions_user_unique ON folder_permissions (physical_dossier_id, user_id) WHERE user_id IS NOT NULL");

        Schema::create('archive_search_documents', function (Blueprint $table) {
            $table->uuid('document_id')->primary();
            $table->uuid('version_id');
            $table->foreignId('physical_dossier_id')->constrained('physical_dossiers')->restrictOnDelete();
            $table->foreignId('nomenclature_entry_id')->constrained('nomenclature_entries')->restrictOnDelete();
            $table->jsonb('staff_metadata');
            $table->jsonb('reader_metadata');
            $table->text('staff_text');
            $table->text('reader_text');
            $table->string('document_type');
            $table->date('act_date')->nullable();
            $table->timestampTz('approved_at');
            $table->timestampsTz();
            $table->foreign(['version_id', 'document_id'], 'archive_search_current_version_fk')
                ->references(['id', 'document_id'])->on('document_versions')->cascadeOnDelete();
            $table->index(['physical_dossier_id', 'approved_at'], 'archive_search_dossier_approved_idx');
            $table->index(['document_type', 'approved_at'], 'archive_search_type_approved_idx');
            $table->index('act_date', 'archive_search_act_date_idx');
        });
        DB::statement("CREATE INDEX archive_search_staff_fts_idx ON archive_search_documents USING GIN (to_tsvector('romanian', staff_text))");
        DB::statement("CREATE INDEX archive_search_reader_fts_idx ON archive_search_documents USING GIN (to_tsvector('romanian', reader_text))");
    }

    public function down(): void
    {
        Schema::dropIfExists('archive_search_documents');
        DB::statement('ALTER TABLE folder_permissions DROP CONSTRAINT IF EXISTS folder_permissions_principal_check');
        Schema::dropIfExists('folder_permissions');
    }
};
