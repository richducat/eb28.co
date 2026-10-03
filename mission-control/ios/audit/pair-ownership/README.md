# iOS pending response ownership audit

Base: `52e842f1d9a3e41cbf5ec6b3a19e8742a20063f8`. Isolated checkout: `/tmp/mission-ios-pair-ownership`; primary checkout was not edited. No push, upload, signing/account operation, production pairing credential or production network request.

The test bundle compiles the actual `API.swift`, `AppModel.swift` and `Models.swift`. Synthetic URLSession requests are retained and completed through URLProtocol, allowing the real methods to suspend while pairing/day ownership changes. Each test session has its own transport handler. Keychain and badge operations are injected as no-ops; production defaults retain their original implementation. `API.baseline.swift.txt` and `AppModel.baseline.swift.txt` retain the original methods plus those injection seams.

## Verification

The same isolated 12-test suite against the baseline exited 65: 11 failed tests, 14 failed assertions, zero unexpected failures. Current-pair address fallback passed; the other tests reproduced old board publication after unpair, old 401 unpairing B, same-code re-pair identity loss, old host preference with B's token, stale A fallback retry, stale asks/action toast, retained Today after current 401, stale day/focus results, and secondary refresh publication after unpair. The day test waits for the newer day to publish before completing the older request.

The restored fixed sources passed all 12 tests, zero failures, exit 0. Full application Release build for generic iOS (iPhoneOS 27 SDK, unsigned) exited 0 with `BUILD SUCCEEDED`. Source hashes checked after the build match `final-sha256.txt`; the only native-build warning was skipped AppIntents metadata extraction because the app does not use AppIntents.

A prior expanded run hit a test harness exception when an earlier automatic refresh reached a global transport handler during the next test. Per-session transport isolation repaired that harness problem. The failed result remains `/tmp/mission-ownership-final12.xcresult`; it is not passing evidence.

Retained result bundles:

- Baseline identical final suite: `/tmp/mission-ownership-baseline12-isolated.xcresult`
- Fixed identical suite: `/tmp/mission-ownership-final12-isolated.xcresult`
- Full compiler logs: `/tmp/mission-ownership-evidence/`
- Compact durable results: adjacent `*-results.txt` files.

## Repair

Pairing generations invalidate every refresh publication, 401 reaction, secondary load, ask/action result and API preferred-host update across suspension. API state runs on MainActor; stale requests cannot begin another fallback attempt. Pair changes clear all pairing-owned model data, busy state, toasts, timestamps and badge count. Day generations plus requested date protect Today and focus results, including leaving and returning to the same day. Reply follow-up loads, delayed note saves, suggestion application and calendar publication check their original context. Each request's TLS delegate captures its initiating pairing fingerprint.

## Reproduce the fixed tests and application build

From `mission-control/ios`, generate the ignored Xcode project with XcodeGen and use a dedicated available simulator UUID:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
xcodegen generate --spec project.yml
xcodebuild test -project MissionControl.xcodeproj -scheme MissionControlTests -destination 'platform=iOS Simulator,id=7BDDA9D9-34FD-4A11-8398-C84DF2560301' -derivedDataPath /tmp/mission-ownership-derived CODE_SIGNING_ALLOWED=NO
xcodebuild build -project MissionControl.xcodeproj -scheme MissionControl -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /tmp/mission-ownership-native-build CODE_SIGNING_ALLOWED=NO
```

To replay baseline, temporarily substitute the two retained baseline source files for API/AppModel, run only the test bundle, and restore the fixed sources. The baseline app source intentionally cannot compile the updated TodayView context usage; the test bundle does not compile that view.

## Limits

URLProtocol exercises the actual URLSession request/response and production ownership methods but does not exercise a TLS handshake. The captured fingerprint delegate is source-audited and compiles in the full native build; actual matching/mismatching certificate behavior requires a separate loopback HTTPS fixture. These checks establish the scoped ownership repair, not production pairing, TestFlight, App Review or release readiness. No current release/account state was checked.
