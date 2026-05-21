# Repository Instructions

## App Store Submission Standard

- Never submit, upload for review, or describe an App Store build as ready unless it is actually production-ready.
- Treat "uploaded to App Store Connect" and "submitted for review" as separate states. Report them separately.
- Do not finish an iOS submission flow with known missing production services, placeholder configs, test ad IDs, missing reviewer credentials, incomplete subscription metadata, incomplete App Privacy answers, or incomplete TestFlight/App Review setup.
- Before any App Store submission, follow the same release procedure used for previously shipped apps such as Snapgrid Remix:
  - verify real Firebase or backend production config is present when the app requires accounts;
  - verify reviewer demo account works against the production backend;
  - verify production AdMob app and ad unit IDs are configured when ads are enabled;
  - verify StoreKit products/subscriptions are created, priced, localized, and ready to submit;
  - verify App Store metadata, screenshots, privacy, terms, support URLs, review notes, and export compliance are complete;
  - run the repo/App Store preflight checks and fix every error;
  - build, archive, export, upload, and then verify App Store Connect/TestFlight status labels directly.
- If any production requirement is blocked by credentials, console re-auth, account permissions, Apple review state, or missing third-party service setup, stop before submission and state the blocker clearly.
- Do not call a project complete until the shipped or submitted artifact matches the stated production requirements.
