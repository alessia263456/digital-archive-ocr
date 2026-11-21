<?php
require '/app/vendor/autoload.php';
$dir = sys_get_temp_dir().'/web-render-'.bin2hex(random_bytes(8));
mkdir($dir);
imagepng(imagecreatetruecolor(2, 3), $dir.'/source.png');
try {
    $pages = (new App\Services\DocumentPageRenderer)->render($dir.'/source.png', $dir.'/pages');
    echo $pages[0]['width'].'x'.$pages[0]['height'];
} catch (Throwable $e) {
    http_response_code(500);
    echo $e->getMessage();
} finally {
    (new Illuminate\Filesystem\Filesystem)->deleteDirectory($dir);
}
