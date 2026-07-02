# CadetCatch Android Emulator QA - 2026-07-01

## Source
- Repo: /Users/richardducat/GITHUB/eb28-cadetcatch-server-search-sop-20260622
- Branch: codex/cadetcatch-server-search-sop-20260622
- Source commit before Android commit: c59f45e10
- Package tested: co.eb28.cadetcatch.debug
- Emulator: CadetCatch_API36_Play, Android 36, Google Play ARM64, 1080x2400

## Build Artifacts
- Debug APK: android/app/build/outputs/apk/debug/app-debug.apk
- Debug APK SHA-256: bb9efdb20e8008a128e1820dc24d9076504e85a34e11359131a3fa8dff18a90c
- Release AAB: android/app/build/outputs/bundle/release/app-release.aab
- Release AAB SHA-256: c3b68c4f5f55b1cda1a1c39f41add9f053572d0ab4b054697702210520c0f93b

## Commands Verified
- npm run cadetcatch:google-play-gate: passed
- npm run cadetcatch:android:build: passed
- npm run cadetcatch:android:bundle: passed
- adb install -r android/app/build/outputs/apk/debug/app-debug.apk: Success

## App Flow Verified
- Launched CadetCatch Android on emulator.
- Home screen rendered without startup crash.
- Imported known cadet test photo from emulator photo picker.
- Ran search against https://api.cadetcatch.com/search using Android client flow.
- Android rendered returned photo_url images in Photos tab.
- Direct backend cross-check returned query_faces_detected=1, matches_returned=7, len(matches)=7.
- First returned URL verified 200 OK image/jpeg: https://pub-2264690a142a418ab996c86d3523fa08.r2.dev/photos/1587686336690126.jpg
- Save action wrote /sdcard/Pictures/CadetCatch/1587686336690126.jpg on emulator.
- Open Full Photo invoked Android browser with the returned photo_url; fresh emulator stopped at Chrome first-run screen before displaying the image.

## Evidence Files
- 2026-07-01-android-home.png
- 2026-07-01-android-selected-photo.png
- 2026-07-01-android-search-results.png
- 2026-07-01-android-open-full-photo-chrome-first-run.png
- 2026-07-01-android-logcat-tail.txt

## Not Yet Verified
- Google Play Console product/license purchase flow.
- Signed production Play upload.
- Real Android phone hardware behavior.
- Play Console Data Safety/content rating UI submission.
