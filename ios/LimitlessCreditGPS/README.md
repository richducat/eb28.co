# Limitless Credit GPS — iOS shell

Native SwiftUI shell that bundles the built Limitless Credit GPS web app
(`/limitless` from the eb28.co build) and serves it offline through a custom
`creditgps://` URL scheme handler, Capacitor-style. Profile answers, saved
simulations, and plan progress persist via WKWebView localStorage.

## Build

```bash
# From the repo root
npm run build                 # produce docs/ (web build)
npm run limitless:ios:sync    # copy web build into ios/LimitlessCreditGPS/WebRoot

cd ios/LimitlessCreditGPS
xcodegen generate             # produce LimitlessCreditGPS.xcodeproj
open LimitlessCreditGPS.xcodeproj
```

Run on a simulator or device from Xcode. Re-run the two npm scripts whenever
the web app changes, then rebuild in Xcode (WebRoot is a folder reference, so
Xcode picks up new files without regenerating the project).

## Before App Store submission

- Add a real 1024x1024 icon to `LimitlessCreditGPS/Assets.xcassets/AppIcon.appiconset`.
- Bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in `project.yml`.
- Review 4.2 (minimum functionality) positioning: the simulator, score-drop
  explainer, and lesson library run fully on-device; call that out in review notes.
