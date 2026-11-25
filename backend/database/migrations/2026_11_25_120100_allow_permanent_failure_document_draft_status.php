<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE document_drafts DROP CONSTRAINT document_drafts_status_check');
        DB::statement("ALTER TABLE document_drafts ADD CONSTRAINT document_drafts_status_check CHECK (status IN ('queued', 'processing', 'failed', 'quarantined', 'review_ready', 'failed_permanently'))");
    }

    public function down(): void
    {
        DB::statement("UPDATE document_drafts SET status = 'quarantined' WHERE status = 'failed_permanently'");
        DB::statement('ALTER TABLE document_drafts DROP CONSTRAINT document_drafts_status_check');
        DB::statement("ALTER TABLE document_drafts ADD CONSTRAINT document_drafts_status_check CHECK (status IN ('queued', 'processing', 'failed', 'quarantined', 'review_ready'))");
    }
};
