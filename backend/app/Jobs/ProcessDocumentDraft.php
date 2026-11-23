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
        $draft = DocumentDraft::query()->findOrFail($this->draftId);
        $draft->status = 'processing';
        $draft->save();

        try {
            DB::transaction(function () use ($processor, $draft): void {
                $draft->ocr_extraction_id = $processor->process($draft);
                $draft->status = 'review_ready';
                $draft->save();
            });
        } catch (Throwable $exception) {
            $draft->status = 'failed';
            $draft->save();
            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        DB::transaction(function (): void {
            $updated = DocumentDraft::query()->whereKey($this->draftId)->update(['status' => 'quarantined']);
            if ($updated === 0) {
                return;
            }

            User::query()->where('role', 'arhivar')->each(
                fn (User $user) => $user->notify(new DocumentDraftQuarantined($this->draftId))
            );
        });
    }
}
