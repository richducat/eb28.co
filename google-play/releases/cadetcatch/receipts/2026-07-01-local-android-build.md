# CadetCatch Android Local Build Receipt

Date: 2026-07-01

Scope: Local Android scaffold/build verification only. No Play Console, App Store, TestFlight, or production backend mutation was performed.

Commands:

- `npm run cadetcatch:google-play-gate`
- `npm run cadetcatch:android:build`
- `npm run cadetcatch:android:bundle`
- `PYTHONPATH=server/cadetcatch-access-api /tmp/cadetcatch-access-api-test-venv/bin/python -m unittest discover server/cadetcatch-access-api/tests -v`

Results:

- Google Play gate passed.
- Android debug APK build passed.
- Android release AAB build passed.
- Access API tests passed: 22/22.

Artifacts:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Release AAB SHA-256: `c3b68c4f5f55b1cda1a1c39f41add9f053572d0ab4b054697702210520c0f93b`

QA gap:

- No Android emulator/device was attached. `adb devices` returned an empty device list, and no `emulator` executable/AVD was found locally, so install/launch UI QA was not run.
