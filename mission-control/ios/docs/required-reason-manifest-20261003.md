# Required reason manifest verification

Base: `e5a8e6d514bc71a854cec398339b5d5b0fdf5ea9`. Verified in isolated worktree `/tmp/eb28-mission-required-reason-20261003`; primary checkout unchanged. This bounded change adds only the required reason declaration for `@AppStorage("cosProfile")` in `MissionControl/Sources/OtherViews.swift:8`.

`MissionControl/PrivacyInfo.xcprivacy` contains one top-level key, `NSPrivacyAccessedAPITypes`, with one dictionary: `NSPrivacyAccessedAPIType = NSPrivacyAccessedAPICategoryUserDefaults`; `NSPrivacyAccessedAPITypeReasons = [CA92.1]`. The stored value selects the app's own Chief of Staff profile. No collected-data, tracking, or tracking-domain fields were added.

## Official structure evidence

Apple's [TN3183: Adding required reason API entries to your privacy manifest](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest) was fetched directly from its official Markdown representation on 2026-10-02. Its complete plist examples have only `NSPrivacyAccessedAPITypes` at the root, including a UserDefaults dictionary with CA92.1. This verifies that a required-reason-only structure is supported; it does not settle the app's data-collection disclosures.

Apple's [required reason definitions](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons?language=objc), previously verified in `/tmp/mission-privacy-age-audit-20261003.md`, define CA92.1 for defaults accessible only to the app itself. The inspected preference matches that purpose. Apple's [manifest placement guidance](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk) requires the root of an iOS app bundle. [TN3181](https://developer.apple.com/documentation/technotes/tn3181-debugging-invalid-privacy-manifest) distinguishes plist-format validation from key/value validation.

## Targeted build and packaged resource evidence

Toolchain: Xcode 27.0, build 27A266a. No global developer-directory change. Commands from `mission-control/ios`:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /opt/homebrew/bin/xcodegen generate
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project MissionControl.xcodeproj -scheme MissionControl \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/mission-required-reason-build-20261003 \
  CODE_SIGNING_ALLOWED=NO build
```

Result: exit 0, `BUILD SUCCEEDED`. Raw build log: `/tmp/mission-required-reason-build-20261003.log`. Generated Xcode project is ignored and uncommitted. XcodeGen automatically added the manifest to the app's Resources phase; no project.yml change was needed.

The build log contains `CpResource` and `builtin-copy` from the source manifest to `/tmp/mission-required-reason-build-20261003/Build/Products/Release-iphoneos/MissionControl.app/PrivacyInfo.xcprivacy`. Both source and packaged file passed `plutil -lint`. Both parsed dictionaries exactly matched the single-key declaration above, including exact reason array and absence of data/tracking keys. Both files had SHA-256:

```text
dc8d7e1f9a7da7f3381f30746b59206ee62ce225b69fe3bcbb66234f8459be35
```

All seven tracked `MissionControl/Sources` Swift files were compared byte-for-byte with base commit objects and were unchanged. The commit changes only this report and the new manifest.

## Limits

This verifies an unsigned device Release build and its packaged resource. It is not an archive, signed distribution, App Store Connect acceptance, upload, submission, or production-readiness finding. App Privacy, provider retention/tracking, age answers, configured agent capabilities, and wider binary/API inventory remain unresolved as documented in the source audit. No `Data Not Collected` declaration was made and no account settings were changed.
