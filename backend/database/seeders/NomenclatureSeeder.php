<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Throwable;

class NomenclatureSeeder extends Seeder
{
    private const HEADERS = [
        'Categorie principala',
        'Subtip',
        'Context arhivare',
        'Indicativ',
        'Termen',
        'De cand curge timpul',
        'Regula',
    ];

    private const BASES = [
        'Nu se aplică (Permanent)',
        'De la 1 ianuarie al anului următor întocmirii/încheierii actului',
        'De la 1 ianuarie al anului următor soluționării dosarului',
        'De la 1 ianuarie al anului următor depunerii',
        'De la împlinirea termenului prevăzut în contract',
        'De la termenul de eliberare a depozitului',
    ];

    public function run(): void
    {
        $this->import(base_path('database/seeders/data/nomenclator_arhivistic.csv'));
    }

    public function import(string $path): void
    {
        if (! is_file($path) || ! ($handle = fopen($path, 'rb'))) {
            throw new InvalidArgumentException('Nu se poate citi nomenclatorul arhivistic.');
        }

        try {
            DB::transaction(function () use ($handle): void {
                $header = fgetcsv($handle);
                if ($header === false) {
                    throw new InvalidArgumentException('Nomenclatorul nu conține antetul CSV.');
                }
                $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
                if ($header !== self::HEADERS) {
                    throw new InvalidArgumentException('Antet CSV invalid la rândul 1.');
                }

                $rowNumber = 1;
                $seen = [];
                while (($source = fgetcsv($handle)) !== false) {
                    $rowNumber++;
                    if ($source === [null] || $source === []) {
                        continue;
                    }

                    $rule = $this->parseRow($source, $rowNumber);
                    $key = json_encode([
                        $rule['document_type'],
                        $rule['subtype'],
                        $rule['storage_context'],
                    ], JSON_THROW_ON_ERROR);
                    if (isset($seen[$key])) {
                        throw new InvalidArgumentException("Clasificare duplicată la rândul {$rowNumber}.");
                    }
                    $seen[$key] = true;

                    $existing = DB::table('nomenclature_entries')
                        ->where('document_type', $rule['document_type'])
                        ->where('subtype', $rule['subtype'])
                        ->where('storage_context', $rule['storage_context'])
                        ->first();

                    if ($existing) {
                        $persisted = (array) $existing;
                        unset($persisted['id'], $persisted['created_at'], $persisted['updated_at']);
                        if ($persisted !== $rule) {
                            throw new InvalidArgumentException("Clasificare existentă cu reguli diferite la rândul {$rowNumber}.");
                        }
                        continue;
                    }

                    try {
                        DB::table('nomenclature_entries')->insert($rule + [
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } catch (Throwable $exception) {
                        throw new InvalidArgumentException("Clasificare duplicată sau invalidă la rândul {$rowNumber}.", 0, $exception);
                    }
                }
            });
        } finally {
            fclose($handle);
        }
    }

    private function parseRow(array $source, int $rowNumber): array
    {
        if (count($source) !== count(self::HEADERS)) {
            throw new InvalidArgumentException("Număr de coloane invalid la rândul {$rowNumber}.");
        }

        $source = array_map(static fn ($value) => trim((string) $value), $source);
        [$type, $subtype, $context, $indicator, $term, $base, $text] = $source;
        if (in_array('', [$type, $subtype, $context, $indicator, $term, $base, $text], true)) {
            throw new InvalidArgumentException("Câmp obligatoriu lipsă la rândul {$rowNumber}.");
        }
        if (! in_array($base, self::BASES, true)) {
            throw new InvalidArgumentException("Clasificare sau bază de retenție invalidă la rândul {$rowNumber}.");
        }

        if ($term === 'P') {
            if ($base !== 'Nu se aplică (Permanent)') {
                throw new InvalidArgumentException("Păstrarea permanentă are o bază invalidă la rândul {$rowNumber}.");
            }
            $years = null;
            $cs = false;
        } elseif (preg_match('/^(\d+) an(?:i)?( C\.S\.)?$/u', $term, $matches)) {
            if ($base === 'Nu se aplică (Permanent)') {
                throw new InvalidArgumentException("Termenul finit are o bază permanentă la rândul {$rowNumber}.");
            }
            $years = (int) $matches[1];
            $cs = ($matches[2] ?? '') !== '';
        } else {
            throw new InvalidArgumentException("Termen de păstrare invalid la rândul {$rowNumber}.");
        }

        return [
            'document_type' => $type,
            'subtype' => $subtype,
            'storage_context' => $context,
            'archival_indicator' => $indicator,
            'retention_term' => $term,
            'retention_years' => $years,
            'cs_flag' => $cs,
            'retention_computation_base' => $base,
            'source_rule' => $text,
        ];
    }
}
