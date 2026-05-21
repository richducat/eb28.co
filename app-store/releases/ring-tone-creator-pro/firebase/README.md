# Firebase Setup

Ring Tone Creator Pro is wired for scalable email signup with Firebase Auth and Firestore.

1. Create a Firebase project.
2. Add an iOS app with bundle ID `co.eb28.ringtonecreatorpro`.
3. Download `GoogleService-Info.plist`.
4. Replace `ios/RingToneCreatorPro/RingToneCreatorPro/GoogleService-Info.plist` with the downloaded file.
5. Enable Firebase Auth `Email/Password`.
6. Create the App Review demo user listed in `review-notes.md`.
7. Create Firestore in production mode.
8. Deploy `firestore.rules`.

The app stores user audio on-device only. Firestore stores account/credit metadata:

- `email`
- `createdAt`
- `updatedAt`
- `freeExportLimit`
- `freeExportsUsed`
- `lastExportAt`
- `subscriptionProductId`
- `subscriptionStatusMirror`
- `appVersion`
