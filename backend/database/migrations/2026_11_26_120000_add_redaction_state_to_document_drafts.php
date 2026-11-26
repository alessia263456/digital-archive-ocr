<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->jsonb('redaction_marks')->nullable();
            $table->text('redacted_pdf_storage_key')->nullable();
            $table->unsignedInteger('redaction_ocr_revision')->nullable();
            $table->unsignedInteger('redaction_detection_revision')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->dropColumn(['redaction_marks', 'redacted_pdf_storage_key', 'redaction_ocr_revision', 'redaction_detection_revision']);
        });
    }
};
