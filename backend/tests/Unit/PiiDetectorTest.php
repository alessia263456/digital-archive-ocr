<?php

namespace Tests\Unit;

use App\Services\PiiDetector;
use Tests\TestCase;

final class PiiDetectorTest extends TestCase
{
    public function test_valid_cnp_split_across_words_with_preceding_anchor_is_automatically_redacted(): void
    {
        $digits = $this->cnp('180010122001');
        $words = [
            $this->word('CNP', 1, 1, 0, 0, 25, 10, 99),
            $this->word(substr($digits, 0, 6), 1, 2, 30, 0, 40, 10, 96),
            $this->word(substr($digits, 6), 1, 3, 75, 0, 45, 10, 91),
        ];

        $candidates = (new PiiDetector)->detect($words, 4);

        self::assertCount(1, $candidates);
        self::assertSame('cnp', $candidates[0]['category']);
        self::assertSame('redact', $candidates[0]['disposition']);
        self::assertSame(4, $candidates[0]['page']);
        self::assertSame(91.0, $candidates[0]['confidence']);
        self::assertSame([$this->box($words[1]), $this->box($words[2])], $candidates[0]['bounding_boxes']);
        self::assertArrayNotHasKey('text', $candidates[0]);
        self::assertArrayNotHasKey('value', $candidates[0]);
        self::assertStringNotContainsString($digits, json_encode($candidates, JSON_THROW_ON_ERROR));
    }

    public function test_confidence_cutoff_is_configurable(): void
    {
        config(['services.ocr.pii_confidence_cutoff' => 97]);
        $digits = $this->cnp('180010122001');
        $words = [
            $this->word('CNP', 1, 1, 0, 0, 25, 10, 99),
            $this->word($digits, 1, 2, 30, 0, 80, 10, 96.9),
        ];

        $candidate = (new PiiDetector)->detect($words, 1)[0];

        self::assertSame('review', $candidate['disposition']);
    }

    public function test_invalid_cnp_and_cnp_without_preceding_anchor_go_to_review(): void
    {
        $digits = $this->cnp('180010122001');
        $invalid = substr($digits, 0, 12).(($digits[12] + 1) % 10);
        $words = [
            $this->word($invalid, 1, 1, 0, 0, 80, 10, 99),
            $this->word($digits, 1, 2, 90, 0, 80, 10, 99),
        ];

        $candidates = (new PiiDetector)->detect($words, 1);

        self::assertCount(2, $candidates);
        self::assertSame(['review', 'review'], array_column($candidates, 'disposition'));
    }

    public function test_iban_checksum_and_context_and_confidence_cutoff(): void
    {
        $words = [
            $this->word('IBAN', 1, 1, 0, 0, 30, 10, 95),
            $this->word('RO49AAAA1B31007593840000', 1, 2, 35, 0, 200, 10, 79.9),
        ];

        $candidate = (new PiiDetector)->detect($words, 2)[0];

        self::assertSame('iban', $candidate['category']);
        self::assertSame('review', $candidate['disposition']);
        self::assertSame(79.9, $candidate['confidence']);
        self::assertArrayNotHasKey('value', $candidate);
    }

    public function test_split_iban_words_are_combined_with_all_identifier_boxes(): void
    {
        $words = [
            $this->word('IBAN', 1, 1, 0, 0, 30, 10, 99),
            $this->word('RO49', 1, 2, 35, 0, 35, 10, 98),
            $this->word('AAAA1B3100', 1, 3, 75, 0, 75, 10, 97),
            $this->word('7593840000', 1, 4, 155, 0, 75, 10, 96),
        ];

        $candidate = (new PiiDetector)->detect($words, 2)[0];

        self::assertSame('iban', $candidate['category']);
        self::assertSame('redact', $candidate['disposition']);
        self::assertSame(96.0, $candidate['confidence']);
        self::assertCount(3, $candidate['bounding_boxes']);
    }

    public function test_invalid_iban_checksum_is_sent_to_review(): void
    {
        $words = [
            $this->word('IBAN', 1, 1, 0, 0, 30, 10, 99),
            $this->word('RO48AAAA1B31007593840000', 1, 2, 35, 0, 200, 10, 99),
        ];

        $candidate = (new PiiDetector)->detect($words, 1)[0];

        self::assertSame('iban', $candidate['category']);
        self::assertSame('review', $candidate['disposition']);
    }

    public function test_anchor_must_precede_identifier_and_be_nearby(): void
    {
        $digits = $this->cnp('180010122001');
        $words = [
            $this->word($digits, 1, 1, 0, 0, 80, 10, 99),
            $this->word('CNP', 1, 2, 90, 0, 25, 10, 99),
            $this->word($digits, 2, 1, 0, 30, 80, 10, 99),
        ];

        $candidates = (new PiiDetector)->detect($words, 1);

        self::assertSame(['review', 'redact'], array_column($candidates, 'disposition'));
    }

    public function test_next_line_anchor_is_limited_by_configuration_and_ambiguous_anchors_require_review(): void
    {
        $digits = $this->cnp('180010122001');
        $words = [
            $this->word('CNP', 1, 1, 0, 0, 25, 10, 99),
            $this->word('Date', 1, 2, 30, 0, 25, 10, 99),
            $this->word('de', 1, 3, 60, 0, 10, 10, 99),
            $this->word('identificare', 1, 4, 75, 0, 60, 10, 99),
            $this->word($digits, 2, 1, 0, 20, 80, 10, 98),
            $this->word('CNP', 2, 2, 90, 20, 25, 10, 98),
            $this->word($digits, 2, 3, 120, 20, 80, 10, 98),
        ];

        $candidates = (new PiiDetector)->detect($words, 1);

        self::assertSame(['redact', 'review'], array_column($candidates, 'disposition'));
    }

    public function test_detects_contact_for_review_and_sensitive_regions_from_conservative_labels(): void
    {
        $words = [
            $this->word('telefon:', 1, 1, 0, 0, 35, 10, 96),
            $this->word('+40722123456', 1, 2, 40, 0, 90, 10, 96),
            $this->word('email:', 1, 3, 140, 0, 35, 10, 94),
            $this->word('ana@example.test', 1, 4, 180, 0, 100, 10, 94),
            $this->word('domiciliat', 1, 5, 0, 20, 60, 10, 90),
            $this->word('în', 1, 6, 65, 20, 15, 10, 90),
            $this->word('București', 1, 7, 85, 20, 70, 10, 90),
            $this->word('seria', 1, 8, 0, 40, 30, 10, 90),
            $this->word('CI', 1, 9, 35, 40, 15, 10, 90),
            $this->word('număr', 1, 10, 55, 40, 40, 10, 90),
            $this->word('AB123456', 1, 11, 100, 40, 70, 10, 90),
        ];

        $candidates = (new PiiDetector)->detect($words, 1);

        self::assertSame(['phone', 'email', 'address', 'identity_card'], array_column($candidates, 'category'));
        self::assertSame(['review', 'review', 'redact', 'redact'], array_column($candidates, 'disposition'));
        foreach ($candidates as $candidate) {
            self::assertArrayNotHasKey('text', $candidate);
            self::assertArrayNotHasKey('value', $candidate);
        }
    }

    public function test_flags_cadastral_vehicle_company_and_party_signature_and_exempts_notary(): void
    {
        $words = [
            $this->word('număr', 1, 1, 0, 0, 40, 10, 95),
            $this->word('cadastral', 1, 2, 45, 0, 60, 10, 95),
            $this->word('12345', 1, 3, 110, 0, 50, 10, 95),
            $this->word('VIN:', 1, 4, 0, 20, 30, 10, 92),
            $this->word('WVWZZZ1JZXW000001', 1, 5, 35, 20, 120, 10, 92),
            $this->word('CUI', 1, 6, 0, 40, 25, 10, 90),
            $this->word('12345678', 1, 7, 30, 40, 60, 10, 90),
            $this->word('semnătura', 1, 8, 0, 60, 50, 10, 89),
            $this->word('Notarul', 1, 9, 0, 80, 50, 10, 99),
            $this->word('public', 1, 10, 55, 80, 40, 10, 99),
            $this->word('semnătura', 1, 11, 100, 80, 50, 10, 99),
            $this->word('semnătura', 2, 1, 0, 100, 50, 10, 99),
            $this->word('notarului', 2, 2, 55, 100, 55, 10, 99),
            $this->word('public', 2, 3, 115, 100, 40, 10, 99),
        ];

        $candidates = (new PiiDetector)->detect($words, 3);

        self::assertSame(['cadastral_identifier', 'vehicle_identifier', 'cui_cif', 'signatory_signature'], array_column($candidates, 'category'));
        self::assertSame(['redact', 'redact', 'redact', 'review'], array_column($candidates, 'disposition'));
    }

    public function test_party_names_go_to_review_and_notary_public_name_is_exempt(): void
    {
        $words = [
            $this->word('subsemnatul', 1, 1, 0, 0, 65, 10, 96),
            $this->word('Ion', 1, 2, 70, 0, 25, 10, 96),
            $this->word('Popescu', 1, 3, 100, 0, 55, 10, 96),
            $this->word('notarul', 1, 4, 0, 20, 50, 10, 99),
            $this->word('public', 1, 5, 55, 20, 40, 10, 99),
            $this->word('domnul', 1, 6, 100, 20, 40, 10, 99),
            $this->word('Mihai', 1, 7, 145, 20, 40, 10, 99),
            $this->word('Ionescu', 1, 8, 190, 20, 55, 10, 99),
        ];

        $candidates = (new PiiDetector)->detect($words, 1);

        self::assertCount(1, $candidates);
        self::assertSame('signatory_name', $candidates[0]['category']);
        self::assertSame('review', $candidates[0]['disposition']);
        self::assertSame([$this->box($words[1]), $this->box($words[2])], $candidates[0]['bounding_boxes']);
    }

    private function word(string $text, int $line, int $order, int $left, int $top, int $width, int $height, float $confidence): array
    {
        return ['text' => $text, 'confidence' => $confidence, 'left' => $left, 'top' => $top,
            'width' => $width, 'height' => $height, 'block_num' => 1, 'paragraph_num' => 1,
            'line_num' => $line, 'word_num' => $order];
    }

    private function cnp(string $firstTwelve): string
    {
        $sum = 0;
        foreach (str_split('279146358279') as $index => $weight) {
            $sum += (int) $firstTwelve[$index] * (int) $weight;
        }
        $control = $sum % 11;
        return $firstTwelve.($control === 10 ? '1' : (string) $control);
    }

    private function box(array $word): array
    {
        return array_intersect_key($word, array_flip(['left', 'top', 'width', 'height']));
    }
}
