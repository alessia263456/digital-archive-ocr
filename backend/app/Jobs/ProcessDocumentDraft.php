<?php

namespace App\Jobs;

use App\Models\DocumentDraft;
use App\Models\User;
use App\Notifications\DocumentDraftQuarantined;
use App\Services\DocumentDraftProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Throwable;

final class ProcessDocumentDraft implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 4;

    public function __construct(public readonly string $draftId) {}

    public function handle(DocumentDraftProcessor $processor): void
    {
        $draft = DB::transaction(function (): ?DocumentDraft {
            $draft = DocumentDraft::query()->whereKey($this->draftId)->lockForUpdate()->firstOrFail();
            if (!in_array($draft->status, ['queued', 'failed'], true)) {
                return null;
            }
            $draft->status = 'processing';
            $draft->save();
            return $draft;
        });

        if ($draft === null) {
            return;
        }

        try {
            DB::transaction(function () use ($processor, $draft): void {
                $draft->ocr_extraction_id = $processor->process($draft);
                $draft->status = 'review_ready';
                $draft->save();
            });
        } catch (Throwable $exception) {
            DocumentDraft::query()->whereKey($this->draftId)->where('status', 'processing')
                ->update(['status' => 'failed', 'updated_at' => now()]);
            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        DB::transaction(function (): void {
            $updated = DocumentDraft::query()->whereKey($this->draftId)->where('status', 'failed')
                ->update(['status' => 'quarantined', 'updated_at' => now()]);
            if ($updated === 0) {
                return;
            }

            User::query()->where('role', 'arhivar')->each(
                fn (User $user) => $user->notify(new DocumentDraftQuarantined($this->draftId))
            );
        });
    }
}
