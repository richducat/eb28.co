#!/bin/bash
# Build Mission Control for iPhone and upload it to TestFlight.
# Needs Xcode, xcodegen, and an App Store Connect API key:
#   ~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8
#   ASC_KEY_ID=...  ASC_ISSUER_ID=...   (set in your shell, never committed)
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ASC_KEY_ID:?set ASC_KEY_ID}" "${ASC_ISSUER_ID:?set ASC_ISSUER_ID}"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
KEY="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
BUILD="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"
OUT="${TMPDIR:-/tmp}/mission-control-ios"
rm -rf "$OUT" && mkdir -p "$OUT"
xcodegen generate --quiet
xcodebuild -project MissionControl.xcodeproj -scheme MissionControl -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$OUT/MissionControl.xcarchive" CURRENT_PROJECT_VERSION="$BUILD" "${AUTH[@]}" archive | tail -3
cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>upload</string>
<key>signingStyle</key><string>automatic</string>
<key>uploadSymbols</key><true/>
</dict></plist>
PLIST
xcodebuild -exportArchive -archivePath "$OUT/MissionControl.xcarchive" -exportPath "$OUT/export" -exportOptionsPlist "$OUT/ExportOptions.plist" "${AUTH[@]}" | tail -3
echo "Uploaded build $BUILD. It appears in TestFlight after Apple finishes processing (usually 5-15 minutes)."
