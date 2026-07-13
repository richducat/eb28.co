<?php
declare(strict_types=1);

require_once __DIR__ . '/../deploy/cadetcatch-upload-portal/ingestion.php';

function assert_true(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$body = cadetcatch_ingestion_body(
    'https://tyfys.net/cadetcatch/photo-a.jpg',
    'photo-a.jpg',
    str_repeat('a', 64),
    'default'
);
$decoded = json_decode($body, true, flags: JSON_THROW_ON_ERROR);
assert_true($decoded['source_url'] === 'https://tyfys.net/cadetcatch/photo-a.jpg', 'source_url missing');
assert_true($decoded['source_filename'] === 'photo-a.jpg', 'source_filename missing');
assert_true($decoded['sha256'] === str_repeat('a', 64), 'sha256 missing');
assert_true($decoded['collection'] === 'default', 'collection missing');

$secret = 'test-ingestion-secret-that-is-at-least-32-characters';
$signature = cadetcatch_ingestion_signature($body, 1234567890, $secret);
assert_true(
    hash_equals(hash_hmac('sha256', '1234567890.' . $body, $secret), $signature),
    'HMAC signature does not match the AWS contract'
);

putenv('CADETCATCH_INGEST_URL');
putenv('CADETCATCH_INGEST_SECRET');
$pending = cadetcatch_notify_ingestion(
    'https://tyfys.net/cadetcatch/photo-a.jpg',
    'photo-a.jpg',
    str_repeat('a', 64)
);
assert_true($pending['accepted'] === false, 'Unconfigured ingestion must fail closed');
assert_true($pending['status'] === 'pending_configuration', 'Unconfigured status must be explicit');

echo "CadetCatch upload ingestion contract checks passed.\n";
