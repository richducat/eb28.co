# CadetCatch Access API

Small FastAPI service for CadetCatch account access, desktop access, and email-bound family/cadet invitations.

This package is source-only until the EB28 release SOP has an exact production deployment approval record. Do not deploy it to `api.cadetcatch.com` from a dirty checkout or without recording the deployment in the EB28 App Agency vault.

## Purpose

The iPhone app and desktop companion already call:

- `GET /access/status`
- `POST /access/subscription/link`
- `GET /access/invitations`
- `POST /access/invitations`
- `GET /access/redeem`
- `POST /access/redeem`
- `POST /access/redeem-invite`

This service implements those endpoints and adds admin-only tester grants so Richard, Karen, Ken, and reviewer accounts can be verified before App Review submission.

## Environment

```bash
CADETCATCH_ACCESS_DB=/var/lib/cadetcatch/access.sqlite3
CADETCATCH_ACCESS_ADMIN_TOKEN=replace-with-long-random-token
CADETCATCH_PUBLIC_BASE_URL=https://api.cadetcatch.com
CADETCATCH_ACCESS_ALLOWED_ORIGINS=https://cadetcatch.com,https://www.cadetcatch.com,https://eb28.co,https://www.eb28.co
CADETCATCH_AUTO_ADMIN_EMAILS=richard@thankyouforyourservice.co,karen@thankyouforyourservice.co,fishkn@upmc.edu
CADETCATCH_INVITE_EMAIL_MODE=smtp
CADETCATCH_INVITE_FROM_EMAIL=support@eb28.co
CADETCATCH_INVITE_FROM_NAME=CadetCatch
CADETCATCH_SMTP_HOST=smtp.example.com
CADETCATCH_SMTP_PORT=587
CADETCATCH_SMTP_USERNAME=replace-with-smtp-username
CADETCATCH_SMTP_PASSWORD=replace-with-smtp-password
CADETCATCH_SMTP_USE_TLS=1
CADETCATCH_SMTP_USE_SSL=0
CADETCATCH_APPLE_ENVIRONMENT=production
CADETCATCH_APPLE_BUNDLE_ID=co.eb28.cadetcatch
CADETCATCH_APPLE_APP_APPLE_ID=6769565852
CADETCATCH_APPLE_ISSUER_ID=replace-with-app-store-connect-issuer-id
CADETCATCH_APPLE_KEY_ID=replace-with-app-store-connect-key-id
CADETCATCH_APPLE_PRIVATE_KEY_PATH=/etc/cadetcatch/AuthKey_REPLACE.p8
CADETCATCH_APPLE_ROOT_CERT_DIR=/etc/cadetcatch/apple-root-certs
CADETCATCH_VALID_SUBSCRIPTION_PRODUCT_IDS=co.eb28.cadetcatch.family.monthly.v1
```

Optional staging-only setting:

```bash
CADETCATCH_ALLOW_UNVERIFIED_STOREKIT=1
```

Do not enable `CADETCATCH_ALLOW_UNVERIFIED_STOREKIT` for production App Review. Production verifies StoreKit transactions through Apple's App Store Server API before treating subscription-link requests as active.

`CADETCATCH_AUTO_ADMIN_EMAILS` is a comma-separated server-side allowlist for internal accounts. Those emails receive full account access, desktop access, and invite permission even if the SQLite access database has not been seeded yet. If the variable is omitted, the default internal allowlist is:

- `richard@thankyouforyourservice.co`
- `karen@thankyouforyourservice.co`
- `fishkn@upmc.edu`

Apple root certificate files must be installed under `CADETCATCH_APPLE_ROOT_CERT_DIR` or listed in `CADETCATCH_APPLE_ROOT_CERT_PATHS`. The verifier uses Apple's signed transaction JWS, rejects the wrong bundle/product/transaction IDs, and rejects expired or revoked subscriptions.

## Invitation Email Delivery

`POST /access/invitations` sends spouse/family and cadet invite links by email. It does not return the raw invite URL to the iPhone app. Production must use `CADETCATCH_INVITE_EMAIL_MODE=smtp`; `console` is local/staging only and `disabled` fails closed with HTTP 503.

Invite emails link to `GET /access/redeem?token=...`, which shows a simple browser activation page. The recipient must enter the same email address that received the invite. The browser form posts to `POST /access/redeem`; the iPhone app can still redeem directly with the JSON `POST /access/redeem-invite` endpoint.

## StoreKit Linking

`POST /access/subscription/link` accepts the iPhone app's StoreKit payload:

```json
{
  "device_id": "generated-app-install-id",
  "email": "subscriber@example.com",
  "product_id": "co.eb28.cadetcatch.family.monthly.v1",
  "transaction_id": "1000000000000001",
  "original_transaction_id": "1000000000000000"
}
```

Production behavior:

- Calls Apple's App Store Server API `get_transaction_info(transaction_id)`.
- Verifies Apple's returned `signedTransactionInfo`.
- Requires bundle ID `co.eb28.cadetcatch`.
- Requires product ID `co.eb28.cadetcatch.family.monthly.v1`.
- Requires matching transaction and original transaction IDs.
- Requires auto-renewable subscription type.
- Rejects revoked or expired subscriptions.
- Grants owner access with invite permission when verification passes.

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
