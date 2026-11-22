<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ocr:extract {source}', function () {
    try {
        $this->line((new \App\Services\OcrExtraction)->extract($this->argument('source')));
        return 0;
    } catch (\Throwable) {
        $this->error('Extragerea OCR a eșuat.');
        return 1;
    }
});

Artisan::command('storage:r2-smoke', function () {
    $this->info('Verificare conectivitate Cloudflare R2...');

    $diskName = config('filesystems.default_document_disk', 'documents');
    $config = config("filesystems.disks.{$diskName}", []);
    $driver = $config['driver'] ?? null;
    $key = $config['key'] ?? null;
    $secret = $config['secret'] ?? null;
    $bucket = $config['bucket'] ?? null;
    $endpoint = $config['endpoint'] ?? null;

    if ($driver !== 's3' || empty($key) || empty($secret) || empty($bucket) || empty($endpoint)) {
        $this->error('Cloudflare R2 nu este configurat complet în fișierul de mediu (.env).');
        $this->line('Variabile necesare: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT.');
        return 1;
    }

    $uuid = bin2hex(random_bytes(8));
    $path = ".smoke-test-{$uuid}.tmp";
    $content = "smoke-test-payload-{$uuid}-".time();

    try {
        $service = new \App\Services\DocumentStorageService($diskName);

        $this->line("1. Încărcare obiect de test: {$path}");
        if (!$service->put($path, $content)) {
            $this->error('Scrierea în Cloudflare R2 a eșuat.');
            return 1;
        }

        $this->line('2. Verificare existență și conținut');
        if (!$service->exists($path)) {
            $this->error('Obiectul scris nu a fost găsit în Cloudflare R2.');
            return 1;
        }

        $readBack = stream_get_contents($service->readStream($path));
        if ($readBack !== $content) {
            $this->error('Conținutul citit nu coincide cu sarcina utilă.');
            return 1;
        }

        $this->line('3. Generare URL semnat cu token opac');
        $service->temporaryUrl($path, now()->addMinutes(15));
        $this->line('URL-ul semnat a fost generat.');

        $this->line('4. Ștergere obiect de unică folosință');
        $service->delete($path);

        if ($service->exists($path)) {
            $this->error('Ștergerea obiectului din Cloudflare R2 a eșuat.');
            return 1;
        }

        $this->info('✓ Verificarea Cloudflare R2 a trecut cu succes.');
        return 0;
    } catch (\Throwable $e) {
        $this->error('Eroare la verificarea Cloudflare R2: '.$e->getMessage());
        return 1;
    }
})->purpose('Verifică scrierea, citirea, semnarea și ștergerea unui obiect de unică folosință în Cloudflare R2');
