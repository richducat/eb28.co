# CadetCatch Google Play Data Safety Draft

This draft must be reviewed in Play Console before submission.

## Data Types

- Photos and videos: users choose a cadet photo for search; matched event photos are displayed from CadetCatch-hosted URLs.
- Personal info: account email is used for subscription access, internal access, family/cadet invites, and desktop access.
- Purchases: Google Play purchase tokens are sent to the CadetCatch access API for server-side verification.
- App activity: search and access actions may be logged server-side for reliability and abuse prevention.
- Device or other IDs: a generated device ID may be sent to the access API for access status and invite redemption.

## Purpose

- App functionality.
- Account management.
- Fraud prevention, security, and compliance.
- Purchase entitlement verification.

## Sharing

Do not disclose R2 write credentials, Google service account keys, admin tokens, or Apple/Google purchase credentials to the app. The Android app should only call public user-facing endpoints.

## User-Facing Disclosure

The app should explain that a selected cadet photo is used to find possible matches in event photos uploaded and indexed by the CadetCatch team.
