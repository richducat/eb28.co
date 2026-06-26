# CadetCatch Desktop Add-On

## Decision

CadetCatch desktop access should be a separate client and entitlement, not a local copy of the iPhone app that bypasses StoreKit or the CadetCatch server.

The iPhone app remains the current release candidate. The desktop app is the next implementation track.

## Current Local Companion

A static desktop companion shell exists at:

- `public/cc/desktop/index.html`
- `docs/cc/desktop/index.html`

It uses:

- `GET https://api.cadetcatch.com/access/status` to verify the same account email and desktop add-on entitlement.
- `POST https://api.cadetcatch.com/search` with multipart field `file`, `top_k`, `min_score`, and `face_index`.
- Returned `match.photo_url` directly for previews and "Open full photo" links.

The page intentionally blocks search until `desktop_add_on_active` is true. As of local build 95 preparation, `https://api.cadetcatch.com/access/status` returns `404`, so this companion is a source-level implementation only and is not production-ready.

## Pricing

- iPhone Family Monthly remains `$12.99/month`.
- Desktop access is an additional `$7.99` add-on.
- The desktop add-on must be represented by a separate approved StoreKit product or entitlement before it is offered to users.

## Safest Desktop Path

Use the static desktop companion for the first browser-based desktop workflow. A Mac Catalyst or native macOS target can come later if Apple distribution is required.

Recommended order:

1. Create a shared account/access layer in the CadetCatch API.
2. Add iOS UI for email-only spouse/family and cadet invitations.
3. Deploy and verify the browser desktop companion behind the same account/access API.
4. Add the desktop add-on StoreKit product in App Store Connect only after exact SOP approval.
5. If needed later, add a Mac Catalyst or native macOS target that reuses:
   - Cadet roster model
   - CadetCatch search API client
   - matched-photo viewer
   - saved photo/note model
   - access-status API client
6. Replace iOS-only capabilities with desktop-safe equivalents:
   - ActivityKit: iOS only, omit on desktop
   - Photos save flow: use desktop file save/export behavior
   - BackgroundTasks: iOS only, omit or replace with desktop refresh
   - UIKit-only settings links: conditionalize for desktop

## Desktop Must Not Do

- Do not embed R2 write keys.
- Do not embed admin upload credentials.
- Do not trust local-only access flags.
- Do not create unlimited family codes.
- Do not ship a desktop build until `$7.99` desktop access can be verified server-side.

## Desktop Acceptance Criteria

- Desktop app can sign in or redeem a server invitation.
- Desktop app can verify owner, spouse/family, cadet, comp, and desktop add-on access.
- Desktop app can upload a search photo to `POST https://api.cadetcatch.com/search`.
- Desktop app displays `photo_url` results returned by the API.
- Desktop app blocks paid desktop behavior unless the `$7.99` desktop add-on entitlement is active.
- Desktop app does not change the iPhone release behavior.
