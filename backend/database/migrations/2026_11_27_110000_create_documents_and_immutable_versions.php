<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE document_drafts DROP CONSTRAINT document_drafts_status_check');
        DB::statement("ALTER TABLE document_drafts ADD CONSTRAINT document_drafts_status_check CHECK (status IN ('queued', 'processing', 'failed', 'quarantined', 'review_ready', 'failed_permanently', 'published'))");
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('physical_dossier_id')->constrained('physical_dossiers')->restrictOnDelete();
            $table->foreignId('nomenclature_entry_id')->constrained('nomenclature_entries')->restrictOnDelete();
            $table->jsonb('metadata');
            $table->uuid('current_version_id')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestampsTz();
        });

        Schema::create('document_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('document_id')->constrained('documents')->restrictOnDelete();
            $table->unsignedInteger('version_number');
            $table->jsonb('source_storage_keys');
            $table->char('source_sha256', 64);
            $table->jsonb('image_sha256s')->nullable();
            $table->text('redacted_pdf_storage_key');
            $table->char('redacted_sha256', 64);
            $table->jsonb('metadata');
            $table->foreignId('nomenclature_entry_id')->constrained('nomenclature_entries')->restrictOnDelete();
            $table->string('retention_status', 16);
            $table->date('retention_base_date')->nullable();
            $table->date('first_eligible_date')->nullable();
            $table->foreignId('approved_by')->constrained('users')->restrictOnDelete();
            $table->timestampTz('approved_at');
            $table->timestampsTz();
            $table->unique(['document_id', 'version_number'], 'document_versions_document_number_unique');
            $table->unique(['id', 'document_id'], 'document_versions_id_document_unique');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->foreign(['current_version_id', 'id'], 'documents_current_version_document_fk')
                ->references(['id', 'document_id'])->on('document_versions')->restrictOnDelete();
        });

        Schema::create('publication_requests', function (Blueprint $table) {
            $table->id();
            $table->string('idempotency_key', 255)->unique();
            $table->foreignUuid('draft_id')->constrained('document_drafts')->restrictOnDelete();
            $table->char('request_sha256', 64);
            $table->jsonb('response');
            $table->timestampsTz();
        });

        Schema::table('document_drafts', function (Blueprint $table) {
            $table->unsignedInteger('metadata_revision')->default(1);
            $table->unsignedInteger('metadata_confirmed_revision')->nullable();
            $table->unsignedInteger('metadata_confirmed_ocr_revision')->nullable();
            $table->jsonb('review_snapshot')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign('documents_current_version_document_fk');
        });
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->dropColumn(['metadata_revision', 'metadata_confirmed_revision', 'metadata_confirmed_ocr_revision', 'review_snapshot']);
        });
        Schema::dropIfExists('publication_requests');
        Schema::dropIfExists('document_versions');
        Schema::dropIfExists('documents');
        DB::statement('ALTER TABLE document_drafts DROP CONSTRAINT document_drafts_status_check');
        DB::statement("ALTER TABLE document_drafts ADD CONSTRAINT document_drafts_status_check CHECK (status IN ('queued', 'processing', 'failed', 'quarantined', 'review_ready', 'failed_permanently'))");
    }
};
