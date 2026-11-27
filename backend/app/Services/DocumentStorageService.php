<?php

namespace App\Services;

use DateTimeInterface;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use RuntimeException;
use Throwable;

final class DocumentStorageService
{
    private readonly string $diskName;

    public function __construct(?string $diskName = null)
    {
        $this->diskName = $diskName ?? config('filesystems.default_document_disk', 'documents');
        $this->validateEnvironmentConfiguration();
    }

    private function validateEnvironmentConfiguration(): void
    {
        if (app()->isProduction()) {
            $config = config("filesystems.disks.{$this->diskName}", []);
            $driver = $config['driver'] ?? null;
            $key = $config['key'] ?? null;
            $secret = $config['secret'] ?? null;
            $bucket = $config['bucket'] ?? null;
            $endpoint = $config['endpoint'] ?? null;

            if ($driver !== 's3' || empty($key) || empty($secret) || empty($bucket) || empty($endpoint)) {
                throw new RuntimeException('Configurația Cloudflare R2 este obligatorie în producție.');
            }
        }
    }

    public function disk(): Filesystem
    {
        return Storage::disk($this->diskName);
    }

    public function put(string $path, mixed $contents, array $options = []): bool
    {
        $this->assertSafePath($path);
        return $this->disk()->put($path, $contents, $options);
    }

    public function exists(string $path): bool
    {
        $this->assertSafePath($path);
        return $this->disk()->exists($path);
    }

    /**
     * @return resource|null
     */
    public function readStream(string $path)
    {
        $this->assertSafePath($path);
        return $this->disk()->readStream($path);
    }

    public function delete(string $path): bool
    {
        $this->assertSafePath($path);
        return $this->disk()->delete($path);
    }

    public function sha256(string $path): string
    {
        $stream = $this->readStream($path);
        if (!$stream) {
            throw new RuntimeException('Fișierul de stocare nu este disponibil.');
        }
        $context = hash_init('sha256');
        try {
            hash_update_stream($context, $stream);
        } finally {
            fclose($stream);
        }
        return hash_final($context);
    }

    public function copyPrivate(string $source, string $destination): void
    {
        $stream = $this->readStream($source);
        if (!$stream) {
            throw new RuntimeException('Fișierul sursă nu este disponibil.');
        }
        try {
            if (!$this->put($destination, $stream, ['visibility' => 'private'])) {
                throw new RuntimeException('Fișierul nu a putut fi copiat în stocarea privată.');
            }
        } finally {
            fclose($stream);
        }
    }

    public function mimeType(string $path): ?string
    {
        $this->assertSafePath($path);
        try {
            return $this->disk()->mimeType($path);
        } catch (Throwable) {
            $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
            return match ($extension) {
                'pdf' => 'application/pdf',
                'png' => 'image/png',
                'jpg', 'jpeg' => 'image/jpeg',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                default => 'application/octet-stream',
            };
        }
    }

    public function temporaryUrl(
        string $path,
        DateTimeInterface $expiresAt,
        string $disposition = 'inline',
        ?string $filename = null
    ): string {
        $this->assertSafePath($path);

        $payload = json_encode([
            'path' => $path,
            'filename' => $filename,
            'ts' => time(),
        ], JSON_THROW_ON_ERROR);

        $encrypted = Crypt::encryptString($payload);
        $token = rtrim(strtr($encrypted, '+/', '-_'), '=');

        $parameters = ['token' => $token];
        if ($disposition === 'attachment') {
            $parameters['disposition'] = 'attachment';
        }
        if ($filename !== null) {
            $parameters['filename'] = $filename;
        }

        return URL::temporarySignedRoute('documents.deliver', $expiresAt, $parameters);
    }

    public function resolveToken(string $token): ?array
    {
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $token)) {
            return null;
        }

        $base64 = strtr($token, '-_', '+/');
        $pad = strlen($base64) % 4;
        if ($pad > 0) {
            $base64 .= str_repeat('=', 4 - $pad);
        }

        try {
            $json = Crypt::decryptString($base64);
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($data) || empty($data['path']) || !is_string($data['path'])) {
                return null;
            }
            $this->assertSafePath($data['path']);
            return $data;
        } catch (Throwable) {
            return null;
        }
    }

    private function assertSafePath(string $path): void
    {
        if (str_contains($path, '..') || preg_match('/[[:cntrl:]]/', $path) || str_contains($path, '\\')) {
            throw new RuntimeException('Calea conține secvențe nepermise.');
        }
    }
}
