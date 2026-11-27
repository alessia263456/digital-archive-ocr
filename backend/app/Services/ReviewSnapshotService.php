<?php

namespace App\Services;

use App\Models\DocumentDraft;
use App\Models\PhysicalDossier;
use Illuminate\Support\Str;

final class ReviewSnapshotService
{
    public function fingerprint(DocumentDraft $draft, DocumentStorageService $storage, RetentionCalculator $retention): string
    {
        $entry = $draft->nomenclatureEntry;
        $metadata = $this->canonicalize($draft->metadata ?? []);
        $state = [
            'source_sha256' => $draft->document_sha256,
            'image_sha256s' => $this->canonicalize($draft->image_sha256s ?? []),
            'source_format' => $draft->source_format,
            'redacted_sha256' => $draft->redacted_pdf_storage_key && $storage->exists($draft->redacted_pdf_storage_key)
                ? $storage->sha256($draft->redacted_pdf_storage_key)
                : null,
            'metadata' => $metadata,
            'dossier_id' => $metadata['physical_dossier_id'] ?? null,
            'dossier' => isset($metadata['physical_dossier_id'])
                ? $this->dossierSnapshot((int) $metadata['physical_dossier_id'])
                : null,
            'classification' => $entry ? [
                'id' => $entry->id, 'archival_indicator' => $entry->archival_indicator,
                'retention_term' => $entry->retention_term,
                'retention_computation_base' => $entry->retention_computation_base,
                'retention' => $retention->calculate($entry, $draft->metadata ?? []),
            ] : null,
            'metadata_revision' => (int) $draft->metadata_revision,
            'ocr_revision' => (int) $draft->ocr_revision,
            'detection_status' => $draft->detection_status,
            'detection_revision' => (int) $draft->detection_revision,
            'pii_candidates' => $this->canonicalize((new RedactionState)->includedCandidates(
                $draft->pii_candidates ?? [], $draft->redaction_excluded_candidate_ids ?? [],
            )),
            'redaction_marks' => $this->canonicalize($draft->redaction_marks ?? []),
            'redaction_excluded_candidate_ids' => $this->canonicalize($draft->redaction_excluded_candidate_ids ?? []),
            'redaction_ocr_revision' => $draft->redaction_ocr_revision,
            'redaction_detection_revision' => $draft->redaction_detection_revision,
        ];

        return hash('sha256', json_encode($this->canonicalize($state), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
    }

    public function issue(DocumentDraft $draft, DocumentStorageService $storage, RetentionCalculator $retention, int $userId): array
    {
        $metadata = $draft->metadata ?? [];
        if (!$draft->metadata_confirmed_at
            || (int) $draft->metadata_confirmed_revision !== (int) $draft->metadata_revision
            || (int) $draft->metadata_confirmed_ocr_revision !== (int) $draft->ocr_revision) {
            throw new PublicationProblem(409, 'metadata_confirmation_required', 'Confirmați din nou metadatele înainte de aprobarea finală.');
        }
        if ($draft->detection_status !== 'ready' || (int) $draft->detection_revision !== (int) $draft->ocr_revision) {
            throw new PublicationProblem(409, 'review_stale', 'Rezultatele OCR și de detectare nu sunt actuale.');
        }
        if (!$draft->redacted_pdf_storage_key || !$storage->exists($draft->redacted_pdf_storage_key)) {
            throw new PublicationProblem(409, 'redaction_required', 'Generați PDF-ul anonimizat înainte de aprobarea finală.');
        }
        if ((int) $draft->redaction_ocr_revision !== (int) $draft->ocr_revision
            || (int) $draft->redaction_detection_revision !== (int) $draft->detection_revision) {
            throw new PublicationProblem(409, 'redaction_stale', 'PDF-ul anonimizat nu corespunde revizuirii curente.');
        }

        $snapshot = [
            'token' => (string) Str::uuid(),
            'fingerprint' => $this->fingerprint($draft, $storage, $retention),
            'ocr_revision' => (int) $draft->ocr_revision,
            'detection_revision' => (int) $draft->detection_revision,
            'metadata_revision' => (int) $draft->metadata_revision,
            'user_id' => $userId,
            'confirmed_at' => now()->toIso8601String(),
        ];
        $draft->review_snapshot = $snapshot;
        $draft->save();
        return $snapshot;
    }

    public function isCurrent(DocumentDraft $draft, string $token, DocumentStorageService $storage, RetentionCalculator $retention): bool
    {
        $snapshot = $draft->review_snapshot;
        return is_array($snapshot)
            && hash_equals((string) ($snapshot['token'] ?? ''), $token)
            && hash_equals((string) ($snapshot['fingerprint'] ?? ''), $this->fingerprint($draft, $storage, $retention));
    }

    private function dossierSnapshot(int $id): ?array
    {
        $dossier = PhysicalDossier::query()->find($id);
        return $dossier?->only(['id', 'physical_dossier_number', 'archival_indicator', 'inventory_number', 'retention_time', 'description']);
    }

    private function canonicalize(array $value): array
    {
        foreach ($value as &$item) {
            if (is_array($item)) {
                $item = $this->canonicalize($item);
            }
        }
        unset($item);
        if (!array_is_list($value)) {
            ksort($value);
        }
        return $value;
    }
}
