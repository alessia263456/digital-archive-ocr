<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->char('document_sha256', 64)->nullable()->index();
            $table->json('image_sha256s')->nullable();
            $table->json('original_names')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('document_drafts', function (Blueprint $table) {
            $table->dropIndex(['document_sha256']);
            $table->dropColumn(['document_sha256', 'image_sha256s', 'original_names']);
        });
    }
};
