<?php

namespace App\Services;

use Illuminate\Filesystem\Filesystem;
use Illuminate\Filesystem\LocalFilesystemAdapter;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

final class DocxConversionService
{
    private const MAX_INPUT = 32 * 1024 * 1024;
    private const MAX_EXPANDED = 128 * 1024 * 1024;

    public function __construct(
        private readonly float $seconds = 60,
        private readonly string $executable = 'libreoffice',
    ) {}

    public function convert(LocalFilesystemAdapter $disk, string $sourceKey, string $pdfKey): void
    {
        $stage = null;
        try {
            $root = realpath($disk->path(''));
            if ($root === false || ($disk->getConfig()['visibility'] ?? 'private') !== 'private') {
                throw new RuntimeException();
            }
            $this->checkKey($root, $sourceKey);
            $this->checkKey($root, $pdfKey);
            $target = $disk->path($pdfKey);
            if ($sourceKey === $pdfKey || file_exists($target) || !is_file($disk->path($sourceKey))) {
                throw new RuntimeException();
            }
            $directory = dirname($target);
            if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
                throw new RuntimeException();
            }
            $private = $directory.'/.docx-'.bin2hex(random_bytes(16));
            if (!mkdir($private, 0700)) {
                throw new RuntimeException();
            }
            $stage = $private;
            $source = $stage.'/input.docx';
            $input = $disk->readStream($sourceKey);
            $output = fopen($source, 'xb');
            try {
                $bytes = stream_copy_to_stream($input, $output, self::MAX_INPUT + 1);
                if (!$bytes || $bytes > self::MAX_INPUT || !fflush($output)) {
                    throw new RuntimeException();
                }
            } finally {
                if (is_resource($input)) {
                    fclose($input);
                }
                fclose($output);
            }
            $this->checkPackage($source);
            mkdir($stage.'/profile', 0700);
            mkdir($stage.'/profile/user', 0700);
            $settings = '<oor:items xmlns:oor="http://openoffice.org/2001/registry">'
                .'<item oor:path="/org.openoffice.Office.Common/Security/Scripting">'
                .'<prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop>'
                .'<prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>'
                .'<item oor:path="/org.openoffice.Office.Writer/Content/Update">'
                .'<prop oor:name="Link" oor:op="fuse"><value>0</value></prop></item></oor:items>';
            file_put_contents($stage.'/profile/user/registrymodifications.xcu', $settings);
            $profile = 'file://'.str_replace('%2F', '/', rawurlencode($stage.'/profile'));
            $deadline = microtime(true) + $this->seconds;
            $this->run([$this->executable, '-env:UserInstallation='.$profile, '--headless', '--norestore',
                '--convert-to', 'pdf:writer_pdf_Export', '--outdir', $stage, $source], $stage, $deadline);
            $pdf = $stage.'/input.pdf';
            if (!is_file($pdf) || is_link($pdf) || filesize($pdf) > self::MAX_INPUT
                || file_get_contents($pdf, false, null, 0, 5) !== '%PDF-') {
                throw new RuntimeException();
            }
            $this->run(['pdfinfo', $pdf], $stage, $deadline);
            chmod($pdf, 0600);
            // link creates the destination only if it is absent, even across competing processes.
            if (!@link($pdf, $target)) {
                throw new RuntimeException();
            }
        } catch (Throwable) {
            throw new RuntimeException('Procesul de conversie DOCX a eșuat.');
        } finally {
            if ($stage !== null) {
                (new Filesystem)->deleteDirectory($stage);
            }
        }
    }

    private function checkKey(string $root, string $key): void
    {
        if (preg_match('/[[:cntrl:]]/', $key) || str_contains($key, '\\')) {
            throw new RuntimeException();
        }
        $path = $root;
        foreach (explode('/', $key) as $part) {
            $path .= '/'.$part;
            if (in_array($part, ['', '.', '..'], true) || is_link($path)) {
                throw new RuntimeException();
            }
        }
    }

    private function checkPackage(string $source): void
    {
        $zip = new ZipArchive;
        if ($zip->open($source, ZipArchive::RDONLY | ZipArchive::CHECKCONS) !== true) {
            throw new RuntimeException();
        }
        try {
            $total = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $total += $zip->statIndex($i)['size'];
                if ($total > self::MAX_EXPANDED) {
                    throw new RuntimeException();
                }
            }
            $types = $zip->getFromName('[Content_Types].xml');
            if (!$types || $zip->locateName('word/document.xml') === false) {
                throw new RuntimeException();
            }
            $xml = simplexml_load_string($types, options: LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
            $type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';
            if (!$xml || !$xml->xpath('//*[local-name()="Override" and @PartName="/word/document.xml" and @ContentType="'.$type.'"]')) {
                throw new RuntimeException();
            }
        } finally {
            $zip->close();
        }
    }

    private function run(array $command, string $stage, float $deadline): void
    {
        $remaining = $deadline - microtime(true);
        if ($remaining <= 0) {
            throw new RuntimeException();
        }
        $process = new Process(['setsid', 'prlimit', '--core=0', '--as=2147483648', '--fsize='.self::MAX_INPUT,
            '--', 'env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin', 'HOME='.$stage, 'TMPDIR='.$stage,
            'LANG=C.UTF-8', ...$command], $stage, timeout: $remaining);
        $process->disableOutput();
        $process->start();
        $pid = $process->getPid();
        try {
            if ($process->wait() !== 0) {
                throw new RuntimeException();
            }
        } finally {
            if ($pid) {
                posix_kill(-$pid, 9);
            }
            $process->stop(0);
        }
    }
}
