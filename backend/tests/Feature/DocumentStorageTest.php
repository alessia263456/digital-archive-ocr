<?php

namespace Tests\Feature;

use App\Services\DocumentStorageService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use RuntimeException;
use Tests\TestCase;

final class DocumentStorageTest extends TestCase
{
    private DocumentStorageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
        Config::set('filesystems.default_document_disk', 'documents');
        Config::set('filesystems.disks.documents', [
            'driver' => 'local',
            'root' => sys_get_temp_dir().'/disks/documents',
            'visibility' => 'private',
        ]);
        Storage::fake('documents');
        $this->service = new DocumentStorageService('documents');
    }

    public function test_production_fails_when_r2_configuration_is_missing(): void
    {
        $this->app['env'] = 'production';
        Config::set('filesystems.disks.documents.driver', 'local');
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Configurația Cloudflare R2 este obligatorie în producție.');
        new DocumentStorageService('documents');
    }

    public function test_stores_and_retrieves_binary_streams_on_documents_disk(): void
    {
        $payload = '%PDF-1.4 synthetic test pdf stream';
        $path = 'originals/2026/test-doc.pdf';
        $this->service->put($path, $payload);

        self::assertTrue($this->service->exists($path));
        self::assertSame($payload, stream_get_contents($this->service->readStream($path)));
    }

    public function test_generates_signed_url_with_url_safe_opaque_token_without_raw_path(): void
    {
        $path = 'originals/2026/confidential.pdf';
        $this->service->put($path, 'content');
        $expiresAt = Carbon::now()->addHour();

        $url = $this->service->temporaryUrl($path, $expiresAt);

        self::assertStringNotContainsString('originals/2026/confidential.pdf', $url);
        self::assertStringNotContainsString('confidential', $url);
        self::assertStringContainsString('/api/documents/deliver/', $url);
        self::assertStringContainsString('signature=', $url);
        self::assertStringContainsString('expires=', $url);

        // Verify token characters are URL-safe (no +, /, or = characters in the path segment)
        $parsedPath = parse_url($url, PHP_URL_PATH);
        $token = basename($parsedPath);
        self::assertMatchesRegularExpression('/^[A-Za-z0-9_-]+$/', $token);
    }

    public function test_signed_url_path_strictly_matches_live_caddy_api_proxy_pattern(): void
    {
        $url = $this->service->temporaryUrl('originals/test.pdf', Carbon::now()->addHour());
        $path = parse_url($url, PHP_URL_PATH);

        // Caddyfile defines `@laravel path /up /api /api/*`
        // Reverse proxy forwards only requests matching this pattern to FrankenPHP
        self::assertMatchesRegularExpression('#^/api/documents/deliver/[A-Za-z0-9_-]+$#', $path);
    }

    public function test_valid_signed_url_delivers_document_with_security_headers_and_correct_mime(): void
    {
        $payload = '%PDF-1.4 synthetic content';
        $path = 'originals/doc.pdf';
        $this->service->put($path, $payload);

        $url = $this->service->temporaryUrl($path, Carbon::now()->addMinutes(15));

        $response = $this->get($url);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
        $response->assertHeader('Cache-Control', 'max-age=0, no-store, private');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertStringContainsString('inline', $response->headers->get('Content-Disposition') ?? '');
        self::assertSame($payload, $response->streamedContent());
    }

    public function test_signed_url_accepts_the_trusted_caddy_https_forwarded_request(): void
    {
        $payload = '%PDF-1.4 forwarded synthetic content';
        $path = 'originals/forwarded.pdf';
        $this->service->put($path, $payload);
        URL::forceRootUrl('https://arhivar.swedencentral.cloudapp.azure.com');
        URL::forceScheme('https');
        $url = $this->service->temporaryUrl($path, Carbon::now()->addMinutes(15));
        $parsed = parse_url($url);
        self::assertSame('https', $parsed['scheme']);
        self::assertSame('arhivar.swedencentral.cloudapp.azure.com', $parsed['host']);

        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '172.20.0.4',
            'HTTP_HOST' => 'backend:8000',
            'HTTP_X_FORWARDED_HOST' => 'arhivar.swedencentral.cloudapp.azure.com',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_PORT' => '443',
        ])->get('http://backend:8000'.$parsed['path'].'?'.$parsed['query']);

        self::assertSame('https://arhivar.swedencentral.cloudapp.azure.com', $this->app['request']->getSchemeAndHttpHost());
        self::assertSame($parsed['path'], $this->app['request']->getPathInfo());
        self::assertSame($parsed['query'], $this->app['request']->server->get('QUERY_STRING'));
        self::assertTrue($this->app['url']->hasCorrectSignature($this->app['request']));
        self::assertTrue($this->app['url']->signatureHasNotExpired($this->app['request']));
        $response->assertOk();
        self::assertSame($payload, $response->streamedContent());
        URL::forceScheme(null);
        URL::forceRootUrl(null);
    }

    public function test_signed_url_rejects_a_tampered_forwarded_host(): void
    {
        $this->service->put('originals/forwarded.pdf', '%PDF-1.4 payload');
        URL::forceRootUrl('https://arhivar.swedencentral.cloudapp.azure.com');
        URL::forceScheme('https');
        $url = $this->service->temporaryUrl('originals/forwarded.pdf', Carbon::now()->addMinutes(15));
        $parsed = parse_url($url);

        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '172.20.0.4',
            'HTTP_HOST' => 'backend:8000',
            'HTTP_X_FORWARDED_HOST' => 'attacker.example',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_PORT' => '443',
        ])->get('http://backend:8000'.$parsed['path'].'?'.$parsed['query']);

        $response->assertForbidden();
        URL::forceScheme(null);
        URL::forceRootUrl(null);
    }

    public function test_signed_url_rejects_forwarded_headers_from_an_untrusted_peer(): void
    {
        $this->service->put('originals/forwarded.pdf', '%PDF-1.4 payload');
        URL::forceRootUrl('https://arhivar.swedencentral.cloudapp.azure.com');
        URL::forceScheme('https');
        $url = $this->service->temporaryUrl('originals/forwarded.pdf', Carbon::now()->addMinutes(15));
        $parsed = parse_url($url);

        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '198.51.100.20',
            'HTTP_HOST' => 'backend:8000',
            'HTTP_X_FORWARDED_HOST' => 'arhivar.swedencentral.cloudapp.azure.com',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_PORT' => '443',
        ])->get('http://backend:8000'.$parsed['path'].'?'.$parsed['query']);

        $response->assertForbidden();
        URL::forceScheme(null);
        URL::forceRootUrl(null);
    }

    public function test_anonymous_request_without_signature_is_rejected_with_403_and_romanian_error(): void
    {
        $path = 'originals/doc.pdf';
        $this->service->put($path, 'payload');
        $validUrl = $this->service->temporaryUrl($path, Carbon::now()->addMinutes(15));
        $unsignedUrl = strtok($validUrl, '?');

        $response = $this->get($unsignedUrl);

        $response->assertStatus(403);
        $response->assertJson([
            'eroare' => 'Semnătură nevalidă sau expirată.',
        ]);
    }

    public function test_expired_signed_url_is_rejected_with_403_and_romanian_error(): void
    {
        $path = 'originals/doc.pdf';
        $this->service->put($path, 'payload');
        $expiredUrl = $this->service->temporaryUrl($path, Carbon::now()->subMinute());

        $response = $this->get($expiredUrl);

        $response->assertStatus(403);
        $response->assertJson([
            'eroare' => 'Semnătură nevalidă sau expirată.',
        ]);
    }

    public function test_tampered_signature_or_query_is_rejected_with_403(): void
    {
        $path = 'originals/doc.pdf';
        $this->service->put($path, 'payload');
        $validUrl = $this->service->temporaryUrl($path, Carbon::now()->addMinutes(15));
        $tamperedUrl = $validUrl.'&tampered=1';

        $response = $this->get($tamperedUrl);

        $response->assertStatus(403);
        $response->assertJson([
            'eroare' => 'Semnătură nevalidă sau expirată.',
        ]);
    }

    public function test_malformed_opaque_token_returns_404(): void
    {
        $url = URL::temporarySignedRoute(
            'documents.deliver',
            Carbon::now()->addMinutes(15),
            ['token' => 'invalid-non-decryptable-token']
        );

        $response = $this->get($url);

        $response->assertStatus(404);
        $response->assertJson([
            'eroare' => 'Fișierul solicitat nu a fost găsit.',
        ]);
    }

    public function test_missing_file_with_valid_token_and_signature_returns_404(): void
    {
        $url = $this->service->temporaryUrl('missing/file.pdf', Carbon::now()->addMinutes(15));

        $response = $this->get($url);

        $response->assertStatus(404);
        $response->assertJson([
            'eroare' => 'Fișierul solicitat nu a fost găsit.',
        ]);
    }

    public function test_content_disposition_parameter_toggles_attachment_download_with_filename(): void
    {
        $path = 'originals/act-notarial.pdf';
        $this->service->put($path, '%PDF-1.4 payload');

        $url = $this->service->temporaryUrl(
            $path,
            Carbon::now()->addMinutes(15),
            disposition: 'attachment',
            filename: 'Descarcare Act.pdf'
        );

        $response = $this->get($url);

        $response->assertStatus(200);
        self::assertStringContainsString('attachment', $response->headers->get('Content-Disposition') ?? '');
        self::assertStringContainsString('Descarcare Act.pdf', $response->headers->get('Content-Disposition') ?? '');
    }

    public function test_r2_smoke_artisan_command_is_registered_and_fails_safely_when_unconfigured(): void
    {
        $this->artisan('storage:r2-smoke')
            ->expectsOutputToContain('Cloudflare R2')
            ->assertExitCode(1);
    }

    public function test_r2_smoke_reports_success_without_printing_the_signed_url(): void
    {
        Config::set('filesystems.disks.documents', [
            'driver' => 's3',
            'key' => 'validation-only',
            'secret' => 'validation-only',
            'region' => 'auto',
            'bucket' => 'validation-only',
            'endpoint' => 'https://example.eu.r2.cloudflarestorage.com',
            'use_path_style_endpoint' => false,
        ]);
        Storage::fake('documents');

        $this->artisan('storage:r2-smoke')
            ->doesntExpectOutputToContain('signature=')
            ->doesntExpectOutputToContain('/api/documents/deliver/')
            ->expectsOutputToContain('Verificarea Cloudflare R2 a trecut cu succes.')
            ->assertExitCode(0);
    }
}
