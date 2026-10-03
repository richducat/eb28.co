# Support and privacy links verification

Verified 2026-10-02 against base commit `51a97cd1555d624e7ccd7ab97661ea84662b1de3` in an isolated worktree.

Changes: native SwiftUI Support and Privacy Policy links on the unpaired screen and paired More screen, shared destinations, minimum 44-point label height, descriptive accessibility hints. The chief-of-staff empty state now accurately describes configurable Mac tools and services instead of guaranteeing a free local model and unproved approval behavior.

## Live destinations

`curl -L` returned HTTP 200 at both exact HTTPS destinations:

- https://eb28.co/missioncontrol/support/ — title EB28 Mission Control Support
- https://eb28.co/missioncontrol/privacy/ — title EB28 Mission Control Privacy

## Build and actual simulator evidence

Generated the ignored Xcode project using `xcodegen generate`. Built successfully with `/Applications/Xcode.app/Contents/Developer` and Xcode's iOS Simulator 27.0 SDK:

```
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project MissionControl.xcodeproj -scheme MissionControl -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/missioncontrol-store-links-build build
```

The earlier unsigned simulator build also succeeded, but Keychain pairing did not persist in that build. Ordinary simulator ad hoc signing allowed the existing DEBUG pairing launch environment to work. No pairing or TLS source was changed.

Installed and launched the actual built app on a dedicated iPhone 18 Pro / iOS 27.0 simulator, UUID `3653A7D5-1522-4069-B334-590E4062D8B2`. Captured screenshots with `simctl io screenshot` and visually inspected both:

- `unpaired.png`: both links visible without clipping on the unpaired screen.
- `more-synthetic-pairing.png`: both links visible in More's Help & Privacy section. Existing DEBUG launch inputs selected tab 4 and used an explicitly synthetic pairing to `https://127.0.0.1:9`; the screen correctly reports Not connected. This proves paired-layout rendering, not a live Mac connection.

`git diff --check` passed. No new tests mirroring static links were added. Browser handoff taps, VoiceOver interaction, larger Dynamic Type, physical-device pairing, release archives, uploads, and submissions were not verified by this scoped change. The source uses native `Link` controls and descriptive labels/hints; destination availability was independently verified above.

App Store Connect metadata saves/readbacks were performed separately by the parent task. This worktree did not push, upload, or submit.
