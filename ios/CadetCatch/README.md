# CadetCatch Native iOS

Native SwiftUI app for Coast Guard Academy families to find possible cadet photos from approved public sources.

## Project

- Project: `CadetCatch.xcodeproj`
- Scheme: `CadetCatch`
- Bundle ID: `co.eb28.cadetcatch`
- Minimum iOS: `17.0`
- Team ID: `WN3K69XEP4`

## Current Features

- EAGLE launch screen with Coast Guard Academy navy/orange theme.
- Private on-device cadet roster using PhotosPicker for profile images.
- Public HTTPS source management.
- Local Apple Vision face comparison against public source images.
- Locked result previews until a StoreKit unlock or monthly entitlement is active.
- StoreKit 2 purchase flow, restore purchases flow, and entitlement refresh.
- Saved photos and review notes for unlocked matches.
- Plain-English academy terms decoder.
- Server-side OpenAI assistant endpoint scaffolded at `api/cadetcatch-assistant.js`.

## StoreKit Products

Create these exact product IDs in App Store Connect before a TestFlight build can sell or restore purchases:

- `co.eb28.cadetcatch.search.once` - consumable one-time public photo check.
- `co.eb28.cadetcatch.photo.unlock` - consumable one-photo unlock.
- `co.eb28.cadetcatch.family.monthly` - auto-renewable monthly subscription.

The app intentionally does not unlock paid behavior when products are missing.

## OpenAI Backend

Do not put an OpenAI API key in the iOS app. Configure the server process with:

```sh
OPENAI_API_KEY=...
CADETCATCH_OPENAI_MODEL=gpt-5-nano
```

The checked-in endpoint uses the Responses API and keeps the key server-side.

## Build

```sh
cd ios/CadetCatch
xcodegen generate
xcodebuild -project CadetCatch.xcodeproj -scheme CadetCatch -destination 'generic/platform=iOS Simulator' build
```

For unsigned device compilation:

```sh
xcodebuild -project CadetCatch.xcodeproj -scheme CadetCatch -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```
