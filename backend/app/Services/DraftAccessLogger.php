<?php

namespace App\Services;

use App\Models\DocumentDraft;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class DraftAccessLogger
{
    public function record(Request $request, DocumentDraft $draft, string $event): void
    {
        DB::table('draft_access_events')->insert([
            'draft_id' => $draft->id,
            'user_id' => $request->user()->id,
            'event' => $event,
            'created_at' => now(),
        ]);
    }
}
