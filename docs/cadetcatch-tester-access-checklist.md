# CadetCatch Tester Access Checklist

## Rule

Do not submit a final App Store Review build until every named tester who needs full access has verified access in the production system.

This is separate from TestFlight installation. A tester being able to install the app does not prove they can use paid/photo access, desktop access, or shared access.

## Required Testers

| Tester | Email | Required Access | Current Status |
| --- | --- | --- | --- |
| Richard Ducat | richducat@gmail.com | Full iPhone access, desktop access, invite/share access | Blocked: `GET /access/status` returned `404` on 2026-06-26 |
| Karen | Pending exact email | Full iPhone access, desktop access, invite/share access | Pending email and backend access setup |
| Ken | Pending exact email | Full iPhone access, desktop access, invite/share access | Pending email and backend access setup |

## Verification Commands

Use the production API, not local mocks:

```bash
curl -i "https://api.cadetcatch.com/access/status?device_id=pre-submit-access-check&email=richducat%40gmail.com"
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
- Richard, Karen, and Ken tester emails must return active full access.
- The iPhone app must show the saved account email as active.
- The desktop companion must unlock search only for active desktop access.
- Spouse/family and cadet invite slots must send or show a clear not-yet-available state.
- A release ledger receipt must record the verification evidence.

