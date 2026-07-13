# CadetCatch Upload Portal

Protected PHP upload portal for the CadetCatch public photo source.

- Intended URL: `https://upload.eb28.co`
- Compatible API URL: `https://tyfys.net/cadetcatch/api.php`
- Default environment variables:
  - `UPLOAD_ADMIN_USERNAME=admin`
  - `UPLOAD_ADMIN_PASSWORD=admin`
  - `UPLOAD_PUBLIC_BASE_URL=https://tyfys.net/cadetcatch`
  - `CADETCATCH_INGEST_URL=https://api.cadetcatch.com/admin/photo-ingest`
  - `CADETCATCH_INGEST_SECRET=<shared HMAC secret, 32+ characters>`
  - `CADETCATCH_INGEST_COLLECTION=default`
  - `CADETCATCH_INGEST_TIMEOUT_SECONDS=15`

Uploads are saved without recompression and only `.jpg`, `.jpeg`, `.png`, and `.heic` files are accepted.

After the file is confirmed readable, the portal calculates its SHA-256 digest and sends a signed ingestion request. A successful upload is never described as searchable unless AWS accepts that request; source-only and rejected indexing states remain visible to the uploader.
