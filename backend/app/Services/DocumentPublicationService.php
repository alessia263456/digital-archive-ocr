<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentDraft;
use App\Models\DocumentVersion;
use App\Models\PhysicalDossier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

final class DocumentPublicationService
{
    public function __construct(
        private readonly DocumentStorageService $storage,
        private readonly RetentionCalculator $retention,
        private readonly ReviewSnapshotService $snapshots,
        private readonly ArchiveSearchIndexer $searchIndexer,
    ) {}

    /** @return array{body: array, status: int, replayed: bool} */
    public function publish(
        string $draftId,
        int $userId,
        string $idempotencyKey,
        string $snapshotToken,
        ?string $targetDocumentId = null,
        ?string $targetVersionId = null,
        ?string $duplicateAction = null,
    ): array {
        $request = [
            'draft_id' => $draftId, 'user_id' => $userId, 'review_snapshot' => $snapshotToken,
            'target_document_id' => $targetDocumentId, 'target_version_id' => $targetVersionId,
            'duplicate_action' => $duplicateAction,
        ];
        $requestHash = hash('sha256', json_encode($request, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        $staged = [];

        try {
            $result = DB::transaction(function () use ($draftId, $userId, $idempotencyKey, $snapshotToken, $targetDocumentId, $targetVersionId, $duplicateAction, $requestHash, &$staged): array {
                DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [$idempotencyKey]);
                $prior = DB::table('publication_requests')->where('idempotency_key', $idempotencyKey)->first();
                if ($prior) {
                    if (!hash_equals($prior->request_sha256, $requestHash)) {
                        throw new PublicationProblem(409, 'idempotency_key_conflict', 'Cheia de idempotență a fost deja folosită pentru o altă cerere.');
                    }
                    $saved = json_decode($prior->response, true, flags: JSON_THROW_ON_ERROR);
                    return ['body' => $saved['body'], 'status' => (int) $saved['status'], 'replayed' => true];
                }

                $draft = DocumentDraft::query()->whereKey($draftId)->lockForUpdate()->first();
                if (!$draft) throw new PublicationProblem(404, 'draft_not_found', 'Ciorna solicitată nu a fost găsită.');
                if ($draft->status !== 'review_ready') throw new PublicationProblem(409, 'draft_not_publishable', 'Ciorna nu mai poate fi publicată.');
                if (!$this->snapshots->isCurrent($draft, $snapshotToken, $this->storage, $this->retention)) {
                    throw new PublicationProblem(409, 'review_stale', 'Confirmarea revizuirii nu mai corespunde stării curente. Revizuiți din nou documentul.');
                }

                $metadata = $draft->metadata ?? [];
                $dossierId = (int) ($metadata['physical_dossier_id'] ?? 0);
                $dossier = PhysicalDossier::query()->whereKey($dossierId)->first();
                if (!$dossier || !$draft->nomenclature_entry_id || !$draft->nomenclatureEntry()->exists()) {
                    throw new PublicationProblem(422, 'metadata_incomplete', 'Alegeți un dosar fizic și o clasificare valide înainte de publicare.');
                }
                if (!$draft->metadata_confirmed_at
                    || (int) $draft->metadata_confirmed_revision !== (int) $draft->metadata_revision
                    || (int) $draft->metadata_confirmed_ocr_revision !== (int) $draft->ocr_revision) {
                    throw new PublicationProblem(409, 'metadata_confirmation_required', 'Confirmați metadatele și OCR înainte de publicare.');
                }
                if (!$draft->document_sha256 || !$draft->redacted_pdf_storage_key) {
                    throw new PublicationProblem(422, 'source_missing', 'Documentul original sau PDF-ul anonimizat nu este disponibil.');
                }

                $exact = DocumentVersion::query()->where('source_sha256', $draft->document_sha256)->exists();
                if ($exact) {
                    throw new PublicationProblem(409, 'exact_duplicate', 'Documentul este identic cu o versiune deja publicată. Publicarea este blocată.');
                }

                $possible = $this->possibleMatches($draft, $metadata);
                if ($targetDocumentId && $duplicateAction === 'separate') {
                    throw new PublicationProblem(422, 'invalid_duplicate_choice', 'Alegeți publicarea ca versiune sau ca document separat, nu ambele.');
                }
                if (!$targetDocumentId && $possible !== [] && $duplicateAction === null) {
                    throw new PublicationProblem(409, 'possible_duplicate', 'Există documente cu același număr și aceeași dată de act sau o colecție reordonată.', [
                        'matches' => $possible,
                        'options' => ['version', 'separate', 'cancel'],
                    ]);
                }
                if ($duplicateAction === 'cancel') {
                    throw new PublicationProblem(409, 'publication_cancelled', 'Publicarea a fost anulată la cererea utilizatorului.');
                }
                if ($duplicateAction !== null && !in_array($duplicateAction, ['version', 'separate'], true)) {
                    throw new PublicationProblem(422, 'invalid_duplicate_choice', 'Opțiunea de publicare nu este validă.');
                }
                if ($duplicateAction === 'version' && !$targetDocumentId) {
                    throw new PublicationProblem(422, 'target_required', 'Selectați documentul pentru care creați o versiune nouă.');
                }

                $target = null;
                if ($targetDocumentId) {
                    $target = Document::query()->whereKey($targetDocumentId)->lockForUpdate()->first();
                    if (!$target) throw new PublicationProblem(404, 'document_not_found', 'Documentul înlocuitor nu a fost găsit.');
                    if (!$targetVersionId || $target->current_version_id !== $targetVersionId) {
                        throw new PublicationProblem(409, 'stale_target_version', 'Versiunea curentă s-a modificat. Reîncărcați documentul înainte de înlocuire.');
                    }
                }

                $versionId = (string) Str::uuid();
                $documentId = $target?->id ?? (string) Str::uuid();
                $versionNumber = $target ? ((int) $target->versions()->max('version_number') + 1) : 1;
                $sourceKeys = [];
                foreach ($draft->original_storage_keys ?? [] as $index => $sourceKey) {
                    $extension = strtolower(pathinfo($sourceKey, PATHINFO_EXTENSION)) ?: 'bin';
                    $destination = "versions/{$documentId}/{$versionId}/source/".sprintf('%04d', $index).'.'.$extension;
                    $staged[] = $destination;
                    $this->storage->copyPrivate($sourceKey, $destination);
                    $sourceKeys[] = $destination;
                }
                if ($sourceKeys === []) throw new PublicationProblem(503, 'storage_failure', 'Fișierul original nu a putut fi pregătit pentru publicare.');
                $redactedKey = "versions/{$documentId}/{$versionId}/redacted.pdf";
                $staged[] = $redactedKey;
                $this->storage->copyPrivate($draft->redacted_pdf_storage_key, $redactedKey);
                $sourceDigest = $draft->document_sha256;
                $redactedDigest = $this->storage->sha256($redactedKey);
                $retention = $this->retention->calculate($draft->nomenclatureEntry, $metadata);

                if (!$target) {
                    $target = Document::query()->create([
                        'id' => $documentId,
                        'physical_dossier_id' => $dossier->id,
                        'nomenclature_entry_id' => $draft->nomenclature_entry_id,
                        'metadata' => $metadata,
                        'created_by' => $userId,
                    ]);
                }
                $version = DocumentVersion::query()->create([
                    'id' => $versionId,
                    'document_id' => $documentId,
                    'version_number' => $versionNumber,
                    'source_storage_keys' => $sourceKeys,
                    'source_sha256' => $sourceDigest,
                    'image_sha256s' => $draft->image_sha256s,
                    'redacted_pdf_storage_key' => $redactedKey,
                    'redacted_sha256' => $redactedDigest,
                    'metadata' => $metadata,
                    'nomenclature_entry_id' => $draft->nomenclature_entry_id,
                    'retention_status' => $retention['status'],
                    'retention_base_date' => $retention['base_date'],
                    'first_eligible_date' => $retention['first_eligible_date'],
                    'approved_by' => $userId,
                    'approved_at' => now(),
                ]);
                $target->physical_dossier_id = $dossier->id;
                $target->nomenclature_entry_id = $draft->nomenclature_entry_id;
                $target->metadata = $metadata;
                $target->current_version_id = $version->id;
                $target->save();
                $this->searchIndexer->reindex($draft, $target, $version);
                $draft->status = 'published';
                $draft->save();

                $body = [
                    'document_id' => $documentId,
                    'version_id' => $versionId,
                    'version_number' => $versionNumber,
                    'retention' => [
                        'status' => $retention['status'],
                        'base_date' => $retention['base_date'],
                        'first_eligible_date' => $retention['first_eligible_date'],
                    ],
                ];
                $status = $target->wasRecentlyCreated ? 201 : 200;
                DB::table('publication_requests')->insert([
                    'idempotency_key' => $idempotencyKey,
                    'draft_id' => $draftId,
                    'request_sha256' => $requestHash,
                    'response' => json_encode(['body' => $body, 'status' => $status], JSON_THROW_ON_ERROR),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('draft_access_events')->insert([
                    'draft_id' => $draft->id, 'user_id' => $userId,
                    'event' => $target->wasRecentlyCreated ? 'document_published' : 'document_version_published',
                    'created_at' => now(),
                ]);
                return ['body' => $body, 'status' => $status, 'replayed' => false];
            }, 3);

            return $result;
        } catch (PublicationProblem $problem) {
            $this->cleanup($staged);
            throw $problem;
        } catch (Throwable $exception) {
            $this->cleanup($staged);
            report($exception);
            throw new PublicationProblem(503, 'storage_failure', 'Documentul nu a putut fi publicat în siguranță. Încercați din nou.');
        }
    }

    private function possibleMatches(DocumentDraft $draft, array $metadata): array
    {
        $matches = [];
        $actNumber = trim((string) ($metadata['act_number'] ?? ''));
        $actDate = $metadata['act_date'] ?? null;
        if ($actNumber !== '' && $actDate) {
            $matches = Document::query()
                ->whereRaw("metadata->>'act_number' = ?", [$actNumber])
                ->whereRaw("metadata->>'act_date' = ?", [$actDate])
                ->get(['id', 'metadata'])
                ->map(static fn (Document $document): array => ['id' => $document->id, 'reason' => 'act_number_and_date'])
                ->all();
        }
        $candidateImages = $draft->image_sha256s ?? [];
        if ($candidateImages !== []) {
            sort($candidateImages, SORT_STRING);
            $publishedImages = DocumentVersion::query()->whereNotNull('image_sha256s')->get(['document_id', 'image_sha256s']);
            foreach ($publishedImages as $version) {
                $images = $version->image_sha256s ?? [];
                sort($images, SORT_STRING);
                if ($images === $candidateImages) $matches[] = ['id' => $version->document_id, 'reason' => 'reordered_image_collection'];
            }
        }
        return collect($matches)->unique('id')->values()->all();
    }

    private function cleanup(array $keys): void
    {
        foreach (array_reverse(array_unique($keys)) as $key) {
            try {
                if ($this->storage->exists($key)) $this->storage->delete($key);
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }
}
