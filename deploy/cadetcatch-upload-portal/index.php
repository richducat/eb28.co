<?php
declare(strict_types=1);

ini_set('display_errors', '0');
ini_set('log_errors', '1');

require_once __DIR__ . '/ingestion.php';

session_name('cadetcatch_upload');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

const MAX_FILES_PER_REQUEST = 30;
const MAX_FILE_BYTES = 15728640;

function env_value(string $key, string $fallback): string
{
    $value = getenv($key);
    return is_string($value) && $value !== '' ? $value : $fallback;
}

function scan_dir_path(): string
{
    $configured = getenv('UPLOAD_SCAN_DIR');
    if (is_string($configured) && $configured !== '') {
        return rtrim($configured, DIRECTORY_SEPARATOR);
    }

    return __DIR__;
}

function public_base_url(): string
{
    return rtrim(env_value('UPLOAD_PUBLIC_BASE_URL', 'https://tyfys.net/cadetcatch'), '/');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }

    return (string) $_SESSION['csrf'];
}

function is_logged_in(): bool
{
    return !empty($_SESSION['upload_admin']);
}

function json_response(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function wants_json(): bool
{
    return str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')
        || strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';
}

function require_csrf(): void
{
    $token = $_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals(csrf_token(), $token)) {
        json_response(419, ['ok' => false, 'message' => 'Session expired. Refresh and try again.']);
    }
}

function normalize_uploads(array $files): array
{
    $normalized = [];
    $count = is_array($files['name'] ?? null) ? count($files['name']) : 0;
    for ($i = 0; $i < $count; $i++) {
        $normalized[] = [
            'name' => (string) ($files['name'][$i] ?? ''),
            'type' => (string) ($files['type'][$i] ?? ''),
            'tmp_name' => (string) ($files['tmp_name'][$i] ?? ''),
            'error' => (int) ($files['error'][$i] ?? UPLOAD_ERR_NO_FILE),
            'size' => (int) ($files['size'][$i] ?? 0),
        ];
    }
    return $normalized;
}

function allowed_extension(string $filename): ?string
{
    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    return in_array($extension, ['jpg', 'jpeg', 'png', 'heic'], true) ? $extension : null;
}

function has_valid_image_signature(string $tmpName, string $extension): bool
{
    if (!is_uploaded_file($tmpName)) {
        return false;
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmpName);
    $allowed = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'heic' => ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence', 'application/octet-stream'],
    ];

    if (!in_array($mime, $allowed[$extension] ?? [], true)) {
        return false;
    }

    if ($extension === 'jpg' || $extension === 'jpeg' || $extension === 'png') {
        return @getimagesize($tmpName) !== false;
    }

    return true;
}

function unique_filename(string $originalName, string $extension): string
{
    $stem = strtolower(pathinfo($originalName, PATHINFO_FILENAME));
    $stem = preg_replace('/[^a-z0-9._-]+/', '-', $stem) ?: 'photo';
    $stem = trim($stem, '.-');
    $stem = substr($stem !== '' ? $stem : 'photo', 0, 48);
    return gmdate('YmdHis') . '-' . bin2hex(random_bytes(8)) . '-' . $stem . '.' . $extension;
}

function upload_photos(): array
{
    if (empty($_FILES['photos'])) {
        return ['ok' => false, 'message' => 'Choose one or more image files first.', 'uploaded' => [], 'rejected' => []];
    }

    $targetDir = scan_dir_path();
    if (!is_dir($targetDir) || !is_writable($targetDir)) {
        return ['ok' => false, 'message' => 'Upload folder is not writable.', 'uploaded' => [], 'rejected' => []];
    }

    $incoming = normalize_uploads($_FILES['photos']);
    if (count($incoming) > MAX_FILES_PER_REQUEST) {
        return ['ok' => false, 'message' => 'Upload 30 files or fewer at a time.', 'uploaded' => [], 'rejected' => []];
    }

    $uploaded = [];
    $rejected = [];

    foreach ($incoming as $file) {
        $name = $file['name'] ?: 'unnamed';
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $rejected[] = ['name' => $name, 'reason' => 'Upload failed before reaching the server.'];
            continue;
        }
        if ($file['size'] <= 0 || $file['size'] > MAX_FILE_BYTES) {
            $rejected[] = ['name' => $name, 'reason' => 'File is empty or larger than 15 MB.'];
            continue;
        }
        $extension = allowed_extension($name);
        if ($extension === null) {
            $rejected[] = ['name' => $name, 'reason' => 'Only JPG, PNG, and HEIC images are accepted.'];
            continue;
        }
        if (!has_valid_image_signature($file['tmp_name'], $extension)) {
            $rejected[] = ['name' => $name, 'reason' => 'File content does not look like a valid image.'];
            continue;
        }

        do {
            $safeName = unique_filename($name, $extension);
            $targetPath = $targetDir . DIRECTORY_SEPARATOR . $safeName;
        } while (file_exists($targetPath));

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            $rejected[] = ['name' => $name, 'reason' => 'Could not save file.'];
            continue;
        }

        chmod($targetPath, 0644);
        $publicUrl = public_base_url() . '/' . rawurlencode($safeName);
        $sha256 = hash_file('sha256', $targetPath);
        $sourceVisible = is_file($targetPath) && is_readable($targetPath) && is_string($sha256);
        $indexing = $sourceVisible
            ? cadetcatch_notify_ingestion($publicUrl, $safeName, $sha256)
            : [
                'accepted' => false,
                'status' => 'source_verification_failed',
                'message' => 'File was saved, but source verification failed.',
            ];
        $uploaded[] = [
            'original' => $name,
            'filename' => $safeName,
            'url' => $publicUrl,
            'sha256' => is_string($sha256) ? $sha256 : null,
            'source_visible' => $sourceVisible,
            'indexing' => $indexing,
        ];
    }

    $indexAccepted = count(array_filter(
        $uploaded,
        static fn(array $item): bool => !empty($item['indexing']['accepted'])
    ));
    $indexAttention = count($uploaded) - $indexAccepted;

    return [
        'ok' => count($uploaded) > 0,
        'indexing_ok' => count($uploaded) > 0 && $indexAttention === 0,
        'message' => count($uploaded) . ' uploaded, ' . $indexAccepted . ' accepted for indexing, '
            . $indexAttention . ' need indexing attention, ' . count($rejected) . ' rejected.',
        'uploaded' => $uploaded,
        'rejected' => $rejected,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'login') {
        require_csrf();
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        $expectedUser = env_value('UPLOAD_ADMIN_USERNAME', 'admin');
        $expectedPass = env_value('UPLOAD_ADMIN_PASSWORD', 'admin');
        if (hash_equals($expectedUser, $username) && hash_equals($expectedPass, $password)) {
            session_regenerate_id(true);
            $_SESSION['upload_admin'] = $username;
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            if (wants_json()) {
                json_response(200, ['ok' => true, 'message' => 'Logged in.']);
            }
            header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
            exit;
        }
        $loginError = 'Login failed.';
    }

    if ($action === 'logout') {
        require_csrf();
        $_SESSION = [];
        session_destroy();
        header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
        exit;
    }

    if ($action === 'upload') {
        require_csrf();
        if (!is_logged_in()) {
            json_response(401, ['ok' => false, 'message' => 'Login required.']);
        }
        json_response(200, upload_photos());
    }
}

$photoCount = 0;
$scanDir = scan_dir_path();
if (is_dir($scanDir)) {
    foreach (glob($scanDir . '/*.{jpg,jpeg,png,heic,JPG,JPEG,PNG,HEIC}', GLOB_BRACE) ?: [] as $path) {
        if (is_file($path)) {
            $photoCount++;
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>CadetCatch Upload</title>
  <style>
    :root { color-scheme: light; --ink:#091827; --muted:#627086; --line:#d7dde6; --bg:#eef3f8; --panel:#fff; --accent:#ff4f1f; --ok:#25a668; --bad:#c9362b; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:var(--bg); color:var(--ink); display:flex; align-items:center; justify-content:center; padding:24px; }
    main { width:min(760px,100%); }
    h1 { font-size:clamp(34px,6vw,56px); line-height:1; margin:0 0 12px; letter-spacing:0; }
    p { margin:0; color:var(--muted); font-size:17px; line-height:1.45; }
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:24px; box-shadow:0 16px 40px rgba(20,35,55,.08); }
    .top { display:flex; gap:16px; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .meta { color:var(--muted); font-size:14px; margin-top:8px; }
    label { display:block; font-weight:700; margin:16px 0 8px; }
    input[type="text"], input[type="password"] { width:100%; min-height:48px; padding:10px 12px; border:1px solid var(--line); border-radius:6px; font-size:17px; }
    button { min-height:48px; border:0; border-radius:6px; padding:0 18px; background:var(--accent); color:white; font-weight:800; font-size:16px; cursor:pointer; }
    button.secondary { background:#dfe6ef; color:var(--ink); }
    button:disabled { opacity:.55; cursor:not-allowed; }
    .actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; align-items:center; }
    .dropzone { border:2px dashed #a8b4c3; border-radius:8px; padding:34px 18px; text-align:center; background:#f8fafc; transition:.15s border-color,.15s background; }
    .dropzone.drag { border-color:var(--accent); background:#fff3ee; }
    .dropzone input { width:100%; max-width:340px; }
    .status { margin-top:18px; border:1px solid var(--line); border-radius:8px; padding:14px; background:#f8fafc; color:var(--muted); min-height:52px; }
    .status.ok { border-color:#a8dfc4; color:#13643d; background:#f1fbf6; }
    .status.bad { border-color:#e8afa9; color:#8e2119; background:#fff4f2; }
    .list { margin-top:12px; display:grid; gap:8px; }
    .item { padding:10px 12px; border:1px solid var(--line); border-radius:6px; background:white; overflow-wrap:anywhere; }
    .item a { color:#163b72; }
    .logout { margin:0; }
    @media (max-width:640px) { body { padding:14px; align-items:flex-start; } .panel { padding:18px; } .top { display:block; } .logout { margin-top:14px; } }
  </style>
</head>
<body>
<main>
  <div class="top">
    <div>
      <h1>CadetCatch Upload</h1>
      <p>Add photos to the same server source scanned by CadetCatch.</p>
      <?php if (is_logged_in()): ?>
        <div class="meta"><?php echo htmlspecialchars((string) $photoCount, ENT_QUOTES); ?> images currently visible in this folder.</div>
      <?php endif; ?>
    </div>
    <?php if (is_logged_in()): ?>
      <form class="logout" method="post">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES); ?>">
        <input type="hidden" name="action" value="logout">
        <button class="secondary" type="submit">Log out</button>
      </form>
    <?php endif; ?>
  </div>

  <section class="panel">
    <?php if (!is_logged_in()): ?>
      <form method="post" autocomplete="off">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES); ?>">
        <input type="hidden" name="action" value="login">
        <label for="username">Username</label>
        <input id="username" name="username" type="text" required autofocus>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required>
        <div class="actions">
          <button type="submit">Log in</button>
          <?php if (!empty($loginError)): ?><span style="color:var(--bad);font-weight:700;"><?php echo htmlspecialchars($loginError, ENT_QUOTES); ?></span><?php endif; ?>
        </div>
      </form>
    <?php else: ?>
      <form id="uploadForm" method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf" value="<?php echo htmlspecialchars(csrf_token(), ENT_QUOTES); ?>">
        <input type="hidden" name="action" value="upload">
        <div id="dropzone" class="dropzone">
          <label for="photos">Choose photos or drag them here</label>
          <input id="photos" name="photos[]" type="file" accept=".jpg,.jpeg,.png,.heic,image/jpeg,image/png,image/heic,image/heif" multiple required>
          <p>JPG, PNG, and HEIC. Up to 30 files, 15 MB each.</p>
        </div>
        <div class="actions">
          <button id="uploadButton" type="submit">Upload photos</button>
          <span id="fileSummary" class="meta">Waiting for files.</span>
        </div>
        <div id="status" class="status">Waiting.</div>
        <div id="results" class="list"></div>
      </form>
    <?php endif; ?>
  </section>
</main>

<?php if (is_logged_in()): ?>
<script>
const form = document.getElementById('uploadForm');
const input = document.getElementById('photos');
const button = document.getElementById('uploadButton');
const statusBox = document.getElementById('status');
const results = document.getElementById('results');
const summary = document.getElementById('fileSummary');
const dropzone = document.getElementById('dropzone');

function setStatus(text, kind = '') {
  statusBox.className = `status ${kind}`;
  statusBox.textContent = text;
}

function updateSummary() {
  const count = input.files ? input.files.length : 0;
  summary.textContent = count ? `${count} selected.` : 'Waiting for files.';
  setStatus(count ? 'Ready to upload.' : 'Waiting.');
}

input.addEventListener('change', updateSummary);
['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('drag');
  });
});
['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag');
  });
});
dropzone.addEventListener('drop', (event) => {
  if (event.dataTransfer.files.length) {
    input.files = event.dataTransfer.files;
    updateSummary();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!input.files || input.files.length === 0) {
    setStatus('Choose one or more files first.', 'bad');
    return;
  }

  button.disabled = true;
  results.innerHTML = '';
  setStatus('Uploading...');

  try {
    const response = await fetch(location.href, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' },
      body: new FormData(form)
    });
    const payload = await response.json();
    setStatus(
      payload.message || (payload.ok ? 'Upload complete.' : 'Upload failed.'),
      payload.ok && payload.indexing_ok ? 'ok' : 'bad'
    );

    for (const item of payload.uploaded || []) {
      const row = document.createElement('div');
      row.className = 'item';
      row.innerHTML = `Uploaded <strong></strong><br><a target="_blank" rel="noopener"></a>`;
      row.querySelector('strong').textContent = item.filename;
      const link = row.querySelector('a');
      link.href = item.url;
      link.textContent = item.url;
      const indexing = document.createElement('div');
      indexing.className = 'meta';
      indexing.textContent = item.indexing && item.indexing.message
        ? item.indexing.message
        : 'Indexing status was not returned.';
      row.appendChild(indexing);
      results.appendChild(row);
    }
    for (const item of payload.rejected || []) {
      const row = document.createElement('div');
      row.className = 'item';
      row.textContent = `${item.name}: ${item.reason}`;
      results.appendChild(row);
    }
    form.reset();
    summary.textContent = 'Waiting for files.';
  } catch (error) {
    setStatus('Upload failed. Check the connection and try again.', 'bad');
  } finally {
    button.disabled = false;
  }
});
</script>
<?php endif; ?>
</body>
</html>
