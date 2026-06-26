# CadetCatch Access API

Small FastAPI service for CadetCatch account access, desktop access, and email-bound family/cadet invitations.

This package is source-only until the EB28 release SOP has an exact production deployment approval record. Do not deploy it to `api.cadetcatch.com` from a dirty checkout or without recording the deployment in the EB28 App Agency vault.

## Purpose

The iPhone app and desktop companion already call:

- `GET /access/status`
- `POST /access/subscription/link`
- `GET /access/invitations`
- `POST /access/invitations`
- `POST /access/redeem-invite`

This service implements those endpoints and adds admin-only tester grants so Richard, Karen, Ken, and reviewer accounts can be verified before App Review submission.

## Environment

```bash
CADETCATCH_ACCESS_DB=/var/lib/cadetcatch/access.sqlite3
CADETCATCH_ACCESS_ADMIN_TOKEN=replace-with-long-random-token
CADETCATCH_PUBLIC_BASE_URL=https://api.cadetcatch.com
CADETCATCH_ACCESS_ALLOWED_ORIGINS=https://eb28.co,https://www.eb28.co
```

Optional staging-only setting:

```bash
CADETCATCH_ALLOW_UNVERIFIED_STOREKIT=1
```

Do not enable `CADETCATCH_ALLOW_UNVERIFIED_STOREKIT` for production App Review. Production should verify StoreKit transactions server-side before treating subscription-link requests as active.

## Local Run

```bash
cd server/cadetcatch-access-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn cadetcatch_access.main:app --host 127.0.0.1 --port 8010
```

## Tester Grant

Admin tester access is intentionally server-side. No master access code is stored in the iPhone app.

```bash
curl -X POST https://api.cadetcatch.com/admin/access-grants \
  -H "Authorization: Bearer $CADETCATCH_ACCESS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "richducat@gmail.com",
    "access_type": "comp",
    "role": "internal",
    "desktop_add_on_active": true,
    "can_invite": true,
    "note": "Internal CadetCatch testing access"
  }'
```

Then verify:

```bash
curl -i "https://api.cadetcatch.com/access/status?device_id=pre-submit-access-check&email=richducat%40gmail.com"
```

Passing response must be HTTP 200 and include:

```json
{
  "active": true,
  "desktop_add_on_active": true
}
```

## Tests

```bash
python3 -m unittest discover server/cadetcatch-access-api/tests -v
```
