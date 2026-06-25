# CadetCatch Desktop Add-On

## Decision

CadetCatch desktop access should be a separate client and entitlement, not a local copy of the iPhone app that bypasses StoreKit or the CadetCatch server.

The iPhone app remains the current release candidate. The desktop app is the next implementation track.

## Pricing

- iPhone Family Monthly remains `$12.99/month`.
- Desktop access is an additional `$7.99` add-on.
- The desktop add-on must be represented by a separate approved StoreKit product or entitlement before it is offered to users.

## Safest Desktop Path

Use the existing SwiftUI app as the shared product surface, but create a separate desktop target after the access API is ready.

Recommended order:

1. Create a shared account/access layer in the CadetCatch API.
2. Add iOS UI for email-only spouse/family and cadet invitations.
3. Add the desktop add-on StoreKit product in App Store Connect only after exact SOP approval.
4. Add a Mac Catalyst or native macOS target that reuses:
   - Cadet roster model
   - CadetCatch search API client
   - matched-photo viewer
   - saved photo/note model
   - access-status API client
5. Replace iOS-only capabilities with desktop-safe equivalents:
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
