# Repository Instructions

## EB28 App Agency Release Safety

This repository is governed by the canonical EB28 App Agency memory and release SOP:

`/Users/richardducat/.hermes/personal-assistant/obsidian-vault/04 Systems/EB28 App Agency/SOP - Release Safety.md`

Before any App Store, TestFlight, production deploy, release metadata, screenshot, app preview, subscription, IAP, build selection, review submission, build expiration, or public release action:

- Read the app record in the EB28 App Agency vault.
- Create or update the matching release-candidate record.
- Confirm the source commit, version, build, bundle ID, metadata, media, icon, subscriptions/IAP, and reviewer notes are recorded.
- Run the release gate script.
- Require a matching approval record for the exact action.
- Write a ledger entry after the action.

Automatic production deploys and App Store mutations are forbidden unless the EB28 App Agency SOP has a matching approval record for that exact action.

Do not archive, upload, submit, release, or deploy from a dirty checkout. Use an isolated git worktree and branch for implementation.

## CadetCatch Local Simulator QA

Richard should not have to remember the simulator command. After any CadetCatch iOS app/source change, run local simulator QA automatically before saying the change is ready and before any TestFlight/App Store step:

`npm run test:cadetcatch`

This command runs the release-surface guard, builds CadetCatch with full Xcode, installs it on an iPhone simulator, launches it, and saves a screenshot receipt under `output/cadetcatch-simulator/`.

If simulator QA fails, fix the app or environment before continuing. Do not substitute TestFlight/App Store upload for local simulator QA.

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
