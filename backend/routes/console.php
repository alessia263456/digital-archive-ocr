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
