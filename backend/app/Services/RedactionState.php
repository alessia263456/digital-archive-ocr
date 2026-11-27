<?php

namespace App\Services;

/** Resolves the single revision-bound Redaction set used by preview, review, and readers. */
final class RedactionState
{
    public function isEligibleAutomatic(array $candidate): bool
    {
        return ($candidate['disposition'] ?? null) === 'redact'
            && ($candidate['location_status'] ?? null) === 'reliable'
            && !empty($candidate['bounding_boxes'])
            && (float) ($candidate['confidence'] ?? 0) >= (float) config('services.ocr.pii_confidence_cutoff', 80);
    }

    public function isIncluded(array $candidate, array $excludedIds): bool
    {
        return $this->hasSafeGeometry($candidate)
            && !in_array($candidate['id'] ?? '', $excludedIds, true);
    }

    public function hasSafeGeometry(array $candidate): bool
    {
        return ($candidate['location_status'] ?? null) === 'reliable'
            && is_array($candidate['bounding_boxes'] ?? null)
            && $candidate['bounding_boxes'] !== [];
    }

    public function includedCandidates(array $candidates, array $excludedIds): array
    {
        return array_values(array_filter($candidates, fn (array $candidate): bool => $this->isIncluded($candidate, $excludedIds)));
    }
}
