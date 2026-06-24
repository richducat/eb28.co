# CadetCatch Access Pass System

## Decision

Do not ship hardcoded free-access codes in the iOS app.

Paid access must come from Apple StoreKit. Free/team/family access must be validated by the CadetCatch server before the app unlocks paid behavior.

## Product Rules

- Public parent purchase: `Family Monthly` auto-renewable subscription at `$19.99/month`.
- Paid subscriber gets full monthly access while Apple subscription is active.
- Paid subscriber can create up to two family access codes.
- Richard, Karen, and Ken can receive free access through server-generated comp codes or Apple offer/promo codes.
- A code unlock is valid only while the server says it is active.
- The app must not contain a master code, admin code, shared secret, or code generator.

## Recommended Architecture

The CadetCatch API should own access passes.

```text
iPhone app
  StoreKit purchase / restore
  redeem access code
        |
        v
CadetCatch API
  verifies Apple subscription transaction
  stores access pass records
  generates family / comp codes
        |
        v
App unlocks paid behavior only from verified StoreKit or API access status
```

## API Endpoints

### POST /access/redeem

Redeems a code for the current installation or user.

Request:

```json
{
  "code": "CC-FAMILY-EXAMPLE",
  "device_id": "generated-app-install-id"
}
```

Response:

```json
{
  "active": true,
  "access_type": "family",
  "expires_at": "2026-07-24T00:00:00Z",
  "message": "Family access active."
}
```

### GET /access/status

Checks whether a device/user currently has an active server access pass.

Request query:

```text
device_id=generated-app-install-id
```

Response:

```json
{
  "active": true,
  "access_type": "comp",
  "expires_at": null
}
```

### POST /access/subscription/link

Links an Apple subscription transaction to the server access system so the subscriber can create family codes.

Request:

```json
{
  "device_id": "generated-app-install-id",
  "product_id": "co.eb28.cadetcatch.family.monthly.v1",
  "transaction_id": "apple-transaction-id",
  "original_transaction_id": "apple-original-transaction-id"
}
```

Server requirement:

- Verify the transaction with Apple server-side APIs.
- Store the original transaction ID.
- Treat family codes as active only while this subscription remains active.

### POST /access/family-codes

Creates or returns the two family codes for an active subscriber.

Request:

```json
{
  "device_id": "generated-app-install-id",
  "original_transaction_id": "apple-original-transaction-id"
}
```

Response:

```json
{
  "codes": [
    {
      "code": "CC-FAM-AAAA-BBBB",
      "redeemed": false
    },
    {
      "code": "CC-FAM-CCCC-DDDD",
      "redeemed": true
    }
  ],
  "max_family_codes": 2
}
```

### POST /admin/access-codes

Internal-only code generator for comp passes.

Security requirements:

- Admin API key required.
- Codes are generated server-side.
- Store only code hashes, not raw code values.
- Support max redemptions, expiration, notes, and revocation.

Request:

```json
{
  "access_type": "comp",
  "count": 3,
  "max_redemptions": 1,
  "expires_at": null,
  "note": "Richard Karen Ken internal access"
}
```

Response:

```json
{
  "codes": [
    "CC-COMP-AAAA-BBBB",
    "CC-COMP-CCCC-DDDD",
    "CC-COMP-EEEE-FFFF"
  ]
}
```

## Database Tables

```text
access_codes
  id
  code_hash
  access_type            comp | family
  owner_original_transaction_id nullable
  max_redemptions
  redemption_count
  expires_at nullable
  revoked_at nullable
  note nullable
  created_at

access_redemptions
  id
  code_id
  device_id
  redeemed_at
  revoked_at nullable

subscription_owners
  id
  device_id
  original_transaction_id
  product_id
  status                  active | expired | revoked | billing_retry
  family_code_limit       2
  last_verified_at
  created_at
```

## iOS App Behavior

- Monthly access is active if StoreKit reports `co.eb28.cadetcatch.family.monthly.v1` as an active entitlement.
- Access code access is active only if `/access/status` or `/access/redeem` returns `active: true`.
- Parent family-code creation is shown only after monthly access is active.
- If the access API is unavailable, the app must fail closed and keep paid features locked.

## App Store Safety

- Do not sell digital access outside Apple in-app purchase.
- Do not use custom codes to bypass Apple payment for public users.
- Apple offer codes/promo codes can be used for official free or discounted access when appropriate.
- Custom server codes are for comp access and subscriber family sharing only.
