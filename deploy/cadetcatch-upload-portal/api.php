<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function cadetcatch_scan_dir(): string
{
    $configured = getenv('UPLOAD_SCAN_DIR');
    if (is_string($configured) && $configured !== '') {
        return rtrim($configured, DIRECTORY_SEPARATOR);
    }

    return __DIR__;
}

function cadetcatch_is_image_name(string $name): bool
{
    return (bool) preg_match('/\.(jpe?g|png|heic)$/i', $name);
}

function cadetcatch_collect_photos(string $dir): array
{
    if (!is_dir($dir) || !is_readable($dir)) {
        return [];
    }

    $photos = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
            static function (SplFileInfo $current): bool {
                $name = $current->getFilename();
                if ($name[0] === '.') {
                    return false;
                }
                if ($current->isDir()) {
                    return !in_array($name, ['_private', 'tmp', 'backups'], true);
                }
                return $current->isFile() && cadetcatch_is_image_name($name);
            }
        )
    );

    foreach ($iterator as $file) {
        if (!$file instanceof SplFileInfo || !$file->isFile()) {
            continue;
        }
        $relative = str_replace('\\', '/', substr($file->getPathname(), strlen($dir) + 1));
        if (str_contains($relative, '../')) {
            continue;
        }
        $photos[] = $relative;
    }

    natcasesort($photos);
    return array_values($photos);
}

$photos = cadetcatch_collect_photos(cadetcatch_scan_dir());

echo json_encode(
    [
        'status' => 'success',
        'count' => count($photos),
        'photos' => $photos,
    ],
    JSON_UNESCAPED_SLASHES
);
