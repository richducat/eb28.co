<?php
declare(strict_types=1);

function cadetcatch_ingestion_config(): array
{
    return [
        'url' => trim((string) (getenv('CADETCATCH_INGEST_URL') ?: '')),
        'secret' => (string) (getenv('CADETCATCH_INGEST_SECRET') ?: ''),
        'collection' => trim((string) (getenv('CADETCATCH_INGEST_COLLECTION') ?: 'default')),
        'timeout' => max(3, min(30, (int) (getenv('CADETCATCH_INGEST_TIMEOUT_SECONDS') ?: 15))),
    ];
}

function cadetcatch_ingestion_body(string $sourceUrl, string $filename, string $sha256, string $collection): string
{
    $body = json_encode(
        [
            'source_url' => $sourceUrl,
            'source_filename' => $filename,
            'sha256' => strtolower($sha256),
            'collection' => $collection,
        ],
        JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );
    return $body;
}

function cadetcatch_ingestion_signature(string $body, int $timestamp, string $secret): string
{
    return hash_hmac('sha256', $timestamp . '.' . $body, $secret);
}

function cadetcatch_notify_ingestion(string $sourceUrl, string $filename, string $sha256): array
{
    $config = cadetcatch_ingestion_config();
    if ($config['url'] === '' || strlen($config['secret']) < 32) {
        return [
            'accepted' => false,
            'status' => 'pending_configuration',
            'message' => 'Saved to the source; AWS indexing connection is not configured.',
        ];
    }
    $parts = parse_url($config['url']);
    if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
        return [
            'accepted' => false,
            'status' => 'configuration_error',
            'message' => 'Saved to the source; ingestion URL is invalid.',
        ];
    }

    try {
        $body = cadetcatch_ingestion_body($sourceUrl, $filename, $sha256, $config['collection']);
    } catch (JsonException) {
        return [
            'accepted' => false,
            'status' => 'request_error',
            'message' => 'Saved to the source; indexing request could not be created.',
        ];
    }
    $timestamp = time();
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'X-CadetCatch-Timestamp: ' . $timestamp,
        'X-CadetCatch-Signature: ' . cadetcatch_ingestion_signature($body, $timestamp, $config['secret']),
    ];

    if (!function_exists('curl_init')) {
        return [
            'accepted' => false,
            'status' => 'transport_unavailable',
            'message' => 'Saved to the source; this server cannot send the indexing request.',
        ];
    }

    $curl = curl_init($config['url']);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => min(5, $config['timeout']),
        CURLOPT_TIMEOUT => $config['timeout'],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    $raw = curl_exec($curl);
    $statusCode = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $transportError = curl_error($curl);
    curl_close($curl);

    if (!is_string($raw) || $transportError !== '') {
        return [
            'accepted' => false,
            'status' => 'notification_failed',
            'message' => 'Saved to the source; AWS indexing could not be reached.',
        ];
    }
    $response = json_decode($raw, true);
    if ($statusCode < 200 || $statusCode >= 300 || !is_array($response) || empty($response['accepted'])) {
        return [
            'accepted' => false,
            'status' => 'notification_rejected',
            'http_status' => $statusCode,
            'message' => 'Saved to the source; AWS rejected the indexing request.',
        ];
    }
    return [
        'accepted' => true,
        'status' => (string) ($response['status'] ?? 'queued'),
        'job_id' => (string) ($response['job_id'] ?? ''),
        'message' => 'Saved to the source and accepted for AWS indexing.',
    ];
}
