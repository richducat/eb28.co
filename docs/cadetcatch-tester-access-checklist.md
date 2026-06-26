# CadetCatch Tester Access Checklist

## Rule

Do not submit a final App Store Review build until every named tester who needs full access has verified access in the production system.

This is separate from TestFlight installation. A tester being able to install the app does not prove they can use paid/photo access, desktop access, or shared access.

## Required Testers

| Tester | Email | Required Access | Current Status |
| --- | --- | --- | --- |
| Richard Ducat | richducat@gmail.com | Full iPhone access, desktop access, invite/share access | Blocked: `GET /access/status` returned `404` on 2026-06-26 |
| Karen Hallett | karen.hallett@mac.com | Full iPhone access, desktop access, invite/share access | Pending production backend grant and verification |
| Ken Fish | kenfish@mac.com | Full iPhone access, desktop access, invite/share access | Pending production backend grant and verification |

Tester emails were recovered from existing App Store Connect/TestFlight snapshot receipts in `app-store/releases/cadetcatch/app-store-connect-snapshots/`.

## Backend Grant Commands

These commands require the CadetCatch access API to be deployed and `CADETCATCH_ACCESS_ADMIN_TOKEN` to be configured on the production server.

```bash
curl -X POST https://api.cadetcatch.com/admin/access-grants \
  -H "Authorization: Bearer $CADETCATCH_ACCESS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"richducat@gmail.com","access_type":"comp","role":"internal","desktop_add_on_active":true,"can_invite":true,"note":"Internal CadetCatch testing access"}'

curl -X POST https://api.cadetcatch.com/admin/access-grants \
  -H "Authorization: Bearer $CADETCATCH_ACCESS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"karen.hallett@mac.com","access_type":"comp","role":"internal","desktop_add_on_active":true,"can_invite":true,"note":"Internal CadetCatch testing access"}'

curl -X POST https://api.cadetcatch.com/admin/access-grants \
  -H "Authorization: Bearer $CADETCATCH_ACCESS_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"kenfish@mac.com","access_type":"comp","role":"internal","desktop_add_on_active":true,"can_invite":true,"note":"Internal CadetCatch testing access"}'
```

## Verification Commands

Use the production API, not local mocks:

```bash
curl -i "https://api.cadetcatch.com/access/status?device_id=pre-submit-access-check&email=richducat%40gmail.com"
curl -i "https://api.cadetcatch.com/access/status?device_id=pre-submit-access-check&email=karen.hallett%40mac.com"
curl -i "https://api.cadetcatch.com/access/status?device_id=pre-submit-access-check&email=kenfish%40mac.com"
```

Passing status must return HTTP 200 with:

```json
{
  "active": true,
  "desktop_add_on_active": true
}
```

## Submission Gate

Before final App Review submission:

- `https://api.cadetcatch.com/access/status` must exist in production.
- Richard, Karen, and Ken tester emails must return active full access:
  - `richducat@gmail.com`
  - `karen.hallett@mac.com`
  - `kenfish@mac.com`
- The iPhone app must show the saved account email as active.
- The desktop companion must unlock search only for active desktop access.
- Spouse/family and cadet invite slots must send or show a clear not-yet-available state.
- Production SMTP invite delivery must be configured; the app response must not expose raw invite URLs.
- A release ledger receipt must record the verification evidence.
