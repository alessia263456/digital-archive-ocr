<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('draft_access_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('draft_id')->index();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('event', 40);
            $table->timestampTz('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('draft_access_events');
    }
};
