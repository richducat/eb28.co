#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APPROVAL_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --approval-file)
            APPROVAL_FILE="${2:-}"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: ./release_app.sh --approval-file /path/to/approval.md"
            exit 2
            ;;
    esac
done

if [[ -z "$APPROVAL_FILE" ]]; then
    echo "Refusing to archive/upload without an EB28 approval record."
    echo "Usage: ./release_app.sh --approval-file /path/to/approval.md"
    exit 2
fi

# 1. Generate the Xcode project
echo "Running xcodegen..."
cd "$SCRIPT_DIR"
xcodegen

echo "Running CadetCatch upload gate..."
node "$REPO_ROOT/scripts/verify-cadetcatch-release.mjs" --mode upload --approval-file "$APPROVAL_FILE"

# 2. Build and Archive the app
echo "Archiving..."
xcodebuild clean archive \
    -project CadetCatch.xcodeproj \
    -scheme CadetCatch \
    -archivePath ./CadetCatch.xcarchive \
    -allowProvisioningUpdates

# 3. Export and Upload to App Store Connect
echo "Exporting and Uploading to App Store Connect..."
xcodebuild -exportArchive \
    -archivePath ./CadetCatch.xcarchive \
    -exportOptionsPlist ExportOptions-upload-app-store-connect.plist \
    -allowProvisioningUpdates

echo "Deployment completed successfully!"
