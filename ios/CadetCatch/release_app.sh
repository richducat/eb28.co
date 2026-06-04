#!/bin/bash
set -e

# 1. Generate the Xcode project
echo "Running xcodegen..."
xcodegen

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
