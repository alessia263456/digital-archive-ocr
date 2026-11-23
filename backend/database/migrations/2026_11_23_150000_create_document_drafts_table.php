<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_drafts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_format', 32);
            $table->json('original_storage_keys');
            $table->text('derived_pdf_storage_key')->nullable();
            $table->string('status', 32)->default('queued');
            $table->timestamps();
        });

        DB::statement("ALTER TABLE document_drafts ADD CONSTRAINT document_drafts_source_format_check CHECK (source_format IN ('pdf', 'docx', 'image_collection'))");
        DB::statement("ALTER TABLE document_drafts ADD CONSTRAINT document_drafts_status_check CHECK (status IN ('queued', 'processing', 'failed', 'quarantined', 'review_ready'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('document_drafts');
    }
};
