<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->jsonb('redaction_excluded_candidate_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->dropColumn('redaction_excluded_candidate_ids');
        });
    }
};
