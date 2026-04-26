# Wake Up Ya Bish 1.1.3 Metadata Rejection

- Date: 2026-04-25
- Submission ID: 06138c03-103c-4984-9ccb-d9531b481e4a
- Version: 1.1.3
- Build: 16
- Guideline: 2.3.6 Performance: Accurate Metadata
- Root cause: App Store Connect age-rating questionnaire had `Advertising` set to `No`, while build 16 includes AdMob advertising.
- Fix applied in App Store Connect: updated the App Age Ratings questionnaire so `Advertising` is set to `Yes`.
- Follow-up: resubmit version 1.1.3 to App Review after confirming the age-rating change is saved.
