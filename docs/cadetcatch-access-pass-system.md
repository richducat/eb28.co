# CadetCatch Access Pass System

## Decision

Do not ship hardcoded free-access codes in the app.

Paid access must come from Apple StoreKit. Free/internal/family access must be validated by the CadetCatch server before the app unlocks paid behavior.

## Product Rules

- Public parent purchase: `Family Monthly` auto-renewable subscription at `$12.99/month`.
- Optional desktop access: additional `$7.99` desktop add-on, implemented as a separate entitlement/product before launch.
- Paid subscriber gets full monthly iPhone access while Apple subscription is active.
- Paid subscriber can send exactly two email invitations:
  - one `spouse_or_family` invitation
  - one `cadet` invitation
- Invitations are sent only by email. The app must not expose a reusable share code that can be copied to many people.
- Each invitation is bound to one recipient email address, one role, one owner subscription, and one redemption.
- Richard, Karen, and Ken can receive free access through server-generated internal comp invitations or Apple offer/promo codes.
- An invitation unlock is valid only while the server says it is active.
- The app must not contain a master code, admin code, shared secret, or code generator.

## QR Code Rule

QR codes may be used only as a convenience link to an email-bound one-time invitation URL.

The QR code must not contain a permanent code or raw entitlement. The server must still verify:

- invite token is valid
- invite is not expired
- invite has not already been redeemed
- entered or confirmed email matches the invited email
- owner subscription is still active
- invite role is `spouse_or_family` or `cadet`

## Recommended Architecture

The CadetCatch API should own access passes and invitation state.

```text
iPhone app / desktop app
  StoreKit purchase / restore
  request spouse or cadet email invite
  redeem invite link or QR link
        |
        v
CadetCatch API
  verifies Apple subscription transaction
  stores subscription owner records
  sends email-bound invite links
  validates invite redemption and access status
        |
        v
App unlocks paid behavior only from verified StoreKit or API access status
```

## API Endpoints

### POST /access/subscription/link

Links an Apple subscription transaction to the server access system so the subscriber can create email invitations.

Request:

```json
{
  "device_id": "generated-app-install-id",
  "product_id": "co.eb28.cadetcatch.family.monthly.v1",
  "transaction_id": "apple-transaction-id",
  "original_transaction_id": "apple-original-transaction-id"
}
```

Server requirements:

- Verify the transaction with Apple server-side APIs.
- Store the original transaction ID.
- Treat invitations as active only while this subscription remains active.

### GET /access/status

Checks whether a device/user currently has active StoreKit-linked or server-granted access.

Request query:

```text
device_id=generated-app-install-id
```

Response:

```json
{
  "active": true,
  "access_type": "subscriber",
  "role": "owner",
  "desktop_add_on_active": false,
  "expires_at": "2026-07-24T00:00:00Z"
}
```

### POST /access/invitations

Creates or resends one of the two allowed email invitations for an active subscriber.

Request:

```json
{
  "device_id": "generated-app-install-id",
  "original_transaction_id": "apple-original-transaction-id",
  "role": "spouse_or_family",
  "recipient_email": "family@example.com"
}
```

Allowed roles:

```text
spouse_or_family
cadet
```

Response:

```json
{
  "sent": true,
  "role": "spouse_or_family",
  "recipient_email": "family@example.com",
  "invite_status": "sent",
  "remaining_invites": {
    "spouse_or_family": 0,
    "cadet": 1
  }
}
```

### GET /access/invitations

Returns invitation status for the active subscriber without exposing reusable raw codes.

Response:

```json
{
  "invitations": [
    {
      "role": "spouse_or_family",
      "recipient_email": "family@example.com",
      "status": "sent",
      "redeemed_at": null
    },
    {
      "role": "cadet",
      "recipient_email": "cadet@example.com",
      "status": "redeemed",
      "redeemed_at": "2026-06-25T16:20:00Z"
    }
  ]
}
```

### POST /access/redeem-invite

Redeems an email invitation token from an email link or QR link.

Request:

```json
{
  "invite_token": "opaque-one-time-token",
  "recipient_email": "family@example.com",
  "device_id": "generated-app-install-id"
}
```

Response:

```json
{
  "active": true,
  "access_type": "family_invite",
  "role": "spouse_or_family",
  "expires_at": "2026-07-24T00:00:00Z",
  "message": "Family access active."
}
```

### POST /admin/access-invitations

Internal-only comp invitation generator for Richard, Karen, Ken, or support use.

Security requirements:

- Admin API key required.
- Invitations are generated server-side.
- Store only token hashes, not raw tokens.
- Support role, recipient email, expiration, notes, and revocation.
- Do not expose this endpoint to the public app UI.

Request:

```json
{
  "access_type": "comp",
  "role": "internal",
  "recipient_email": "ken@example.com",
  "expires_at": null,
  "note": "Internal CadetCatch testing access"
}
```

## Database Tables

```text
subscription_owners
  id
  device_id
  original_transaction_id
  product_id
  status                  active | expired | revoked | billing_retry
  spouse_or_family_limit  1
  cadet_limit             1
  desktop_add_on_active
  last_verified_at
  created_at

access_invitations
  id
  token_hash
  owner_original_transaction_id nullable
  access_type            family_invite | comp
  role                   owner | spouse_or_family | cadet | internal
  recipient_email
  status                 draft | sent | redeemed | revoked | expired
  redeemed_device_id nullable
  redeemed_at nullable
  expires_at nullable
  revoked_at nullable
  note nullable
  created_at
```

## iOS App Behavior

- Monthly access is active if StoreKit reports `co.eb28.cadetcatch.family.monthly.v1` as an active entitlement.
- Desktop access is active only if the desktop add-on entitlement is active.
- Invite access is active only if `/access/status` or `/access/redeem-invite` returns `active: true`.
- The `Share Access` section is shown only after monthly access is active and the access API is reachable.
- The app should show two clear invite slots:
  - Spouse or family member
  - Cadet
- Each slot accepts one email address and shows sent/redeemed/revoked status.
- If the access API is unavailable, the app must fail closed and keep paid features locked.

## Desktop App Behavior

- The desktop app must use the same CadetCatch API and access status checks as iOS.
- Desktop access must be gated by the `$7.99` desktop add-on entitlement before paid desktop behavior unlocks.
- The desktop app must not store R2 secrets, admin upload credentials, or invite-generation secrets.

## App Store Safety

- Do not sell digital access outside Apple in-app purchase.
- Do not use custom codes to bypass Apple payment for public users.
- Apple offer codes/promo codes can be used for official free or discounted access when appropriate.
- Custom server invitations are for internal comp access and subscriber family sharing only.
