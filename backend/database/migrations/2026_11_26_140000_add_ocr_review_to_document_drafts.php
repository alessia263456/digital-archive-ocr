<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->jsonb('corrected_ocr')->nullable();
            $table->unsignedInteger('ocr_revision')->default(1);
            $table->string('detection_status', 16)->default('pending');
            $table->unsignedInteger('detection_revision')->default(0);
            $table->jsonb('pii_candidates')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->dropColumn(['corrected_ocr', 'ocr_revision', 'detection_status', 'detection_revision', 'pii_candidates']);
        });
    }
};
