<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

final class DocumentDraftQuarantined extends Notification
{
    public function __construct(private readonly string $draftId) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, string> */
    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => 'Document mutat în Carantină',
            'body' => 'Procesarea OCR a eșuat după patru încercări.',
            'draft_id' => $this->draftId,
        ];
    }
}
