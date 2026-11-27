<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION reject_immutable_record_mutation() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'This record is append-only.' USING ERRCODE = '55000';
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER document_versions_append_only
            BEFORE UPDATE OR DELETE ON document_versions
            FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();

            CREATE TRIGGER draft_access_events_append_only
            BEFORE UPDATE OR DELETE ON draft_access_events
            FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_mutation();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TRIGGER IF EXISTS draft_access_events_append_only ON draft_access_events;
            DROP TRIGGER IF EXISTS document_versions_append_only ON document_versions;
            DROP FUNCTION IF EXISTS reject_immutable_record_mutation();
        SQL);
    }
};
