<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.',
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON payload.',
    ]);
    exit;
}

$email = trim((string) ($payload['email'] ?? $payload['contactEmail'] ?? ''));
$name = trim((string) ($payload['name'] ?? $payload['businessName'] ?? ''));
$serviceNeed = trim((string) ($payload['serviceNeed'] ?? 'melbourne-web-studio-lead'));
$subject = trim((string) ($payload['_subject'] ?? ''));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'A valid email address is required.',
    ]);
    exit;
}

if ($subject === '') {
    $subject = sprintf('Melbourne Web Studio lead: %s', $serviceNeed);
}

$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? 'eb28.co'));
$fromEmail = sprintf('noreply@%s', preg_replace('/^www\./', '', $host));
if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    $fromEmail = 'noreply@eb28.co';
}

$lines = [
    'Melbourne Web Studio lead received',
    '=================================',
    'Submitted At: ' . gmdate('Y-m-d H:i:s') . ' UTC',
    'Service Need: ' . $serviceNeed,
    'Source Page: ' . trim((string) ($payload['sourcePage'] ?? 'unknown')),
    'Name: ' . ($name !== '' ? $name : 'Not provided'),
    'Email: ' . $email,
    'IP Address: ' . trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown')),
    'User Agent: ' . trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? 'unknown')),
    '',
    'Submission Data',
    '---------------',
];

foreach ($payload as $key => $value) {
    if ($key === '_subject') {
        continue;
    }

    if (is_array($value)) {
        $formatted = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    } elseif (is_bool($value)) {
        $formatted = $value ? 'true' : 'false';
    } elseif ($value === null) {
        $formatted = 'null';
    } else {
        $formatted = trim((string) $value);
    }

    if ($formatted === '') {
        continue;
    }

    $label = ucwords(str_replace(['_', '-'], ' ', (string) $key));
    $lines[] = sprintf("%s: %s", $label, $formatted);
}

$body = implode("\n", $lines) . "\n";

$headers = [
    sprintf('From: Melbourne Web Studio <%s>', $fromEmail),
    sprintf('Reply-To: %s', $email),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];

if ($host === '127.0.0.1' || $host === 'localhost') {
    echo json_encode([
        'success' => true,
        'message' => 'Local development submission accepted.',
        'preview' => $body,
    ]);
    exit;
}

$sent = mail('richducat@gmail.com', $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Mail delivery failed on the server.',
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Lead captured successfully.',
]);
