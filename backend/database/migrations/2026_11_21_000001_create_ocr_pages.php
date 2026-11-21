<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ocr_pages', function (Blueprint $table) {
            $table->uuid('extraction');
            $table->char('source_sha256', 64);
            $table->unsignedInteger('page');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->text('text');
            $table->text('tsv');
            $table->jsonb('words');
            $table->primary(['extraction', 'page']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ocr_pages');
    }
};
