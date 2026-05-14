# CadetCatch Native iOS

CadetCatch is now scaffolded as a native SwiftUI app separate from the existing `ios/App` Capacitor project.

## Project

- Project: `CadetCatch.xcodeproj`
- Scheme: `CadetCatch`
- Bundle ID: `co.eb28.cadetcatch`
- Minimum iOS: `17.0`
- Project generator: `xcodegen generate`

## Current Native Features

- Premium onboarding and Pro activation flow.
- StoreKit subscription scaffold for `co.eb28.cadetcatch.pro.monthly`.
- Persistent private cadet roster.
- PhotosPicker-based cadet base photo import.
- Smart Sweep, Deep Recon, and New Drops scan modes.
- Scan history and confidence-scored intel matches.
- Saved intel archive.
- Asset dossier sheet with local AI-style sitrep and parent letter draft.
- Offline academy jargon decoder.
- Profile/settings for priority alerts, background watch, subscription, and local data reset.

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

## App Store Setup Still Needed

- Create the App Store Connect app record for `co.eb28.cadetcatch`.
- Create the monthly subscription product `co.eb28.cadetcatch.pro.monthly`.
- Set the Apple Developer Team ID in `project.yml`, then regenerate the project.
- Replace the generated placeholder icon with final brand artwork when ready.
