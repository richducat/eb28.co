# CadetCatch Release Guard

This folder has a repo-level guard to prevent old CadetCatch builds or stale App Store metadata from being uploaded by mistake.

## What Runs

- `npm run cadetcatch:release-gate`
  - Verifies the current CadetCatch release surface is internally consistent.
  - Checks `app-store-release.json`, `release-manifest.json`, review notes, metadata, screenshots, `project.yml`, and `project.pbxproj`.
  - Fails if active release inputs reference stale builds such as build 13 or build 57.

- `npm run cadetcatch:upload-gate -- --approval-file /path/to/approval.md`
  - Runs stricter upload checks.
  - Requires a build number greater than the highest known uploaded build in `build-ledger.json`.
  - Requires a matching EB28 vault approval record for `upload_build`.

- `ios/CadetCatch/release_app.sh --approval-file /path/to/approval.md`
  - Refuses to archive or upload unless the upload gate passes first.

## Current Guard State

- Active App Store review recovery candidate: `1.0.1 (80)`.
- Highest known uploaded build: `84`.
- Next new upload must use build `85` or higher.
- Build `80` is intentionally blocked for new upload because it is already the active review recovery candidate.

## Normal Update Flow

1. Make app/source changes.
2. Pick a new build number greater than `84`.
3. Update all active release inputs to the same version/build:
   - `ios/CadetCatch/project.yml`
   - `ios/CadetCatch/CadetCatch.xcodeproj/project.pbxproj`
   - `app-store/releases/cadetcatch/app-store-release.json`
   - `app-store/releases/cadetcatch/release-manifest.json`
   - `app-store/releases/cadetcatch/app-store-metadata.md`
   - `app-store/releases/cadetcatch/review-notes.md`
4. Run `npm run cadetcatch:release-gate`.
5. Commit the clean release candidate.
6. Create a matching EB28 vault approval record for the exact `upload_build` action.
7. Run `ios/CadetCatch/release_app.sh --approval-file /path/to/approval.md`.

Do not edit App Store Connect, select builds, upload builds, submit for review, release, expire builds, or change TestFlight state unless the EB28 App Agency SOP approval record exists for that exact action.
