# Finish the SyncStep release on the Mac (about 10 minutes)

The app fix is done and pushed on branch `claude/solana-syncstepp-review-fix-2qozow`.
Only the steps that need this Mac's keystore and the store login are left. Paste this whole
file to Codex (or follow it by hand).

## Goal
Publish SyncStep 2.6 (versionCode 19) to the Solana dApp Store, signed with the SAME key as
2.5 (cert SHA-256 `2ad1ce68cc9ce6beaff01ef59b22180ad8188542b7556860b642111aa0e4a834`).

## Steps
1. `git fetch origin claude/solana-syncstepp-review-fix-2qozow && git checkout claude/solana-syncstepp-review-fix-2qozow`
2. Find the release keystore used for SyncStep 1.7 to 2.5: `apps/syncstep/scripts/find-keystore.sh`
   (lists candidates, paths only). The right one is the file whose cert digest matches the
   value above; `release.sh` checks that for you and refuses any other key.
3. Run the tests, then build, sign and verify (needs JDK 21, Node 20+ and the Android SDK; set
   `ANDROID_HOME` if not at `~/Library/Android/sdk`). `cd apps/syncstep && npm ci && npm test` must print
   `native-mwa contract: all checks passed`. Then, from the repo root:
   ```
   export SYNCSTEP_KEYSTORE_PATH=/path/to/that.keystore
   export SYNCSTEP_KEYSTORE_PASSWORD='...'
   apps/syncstep/scripts/release.sh
   ```
   Expect `signing cert matches the 2.5 release key` and `OK .../dist/syncstep-2.6.apk`.
   If it prints `signing cert mismatch`, try the next keystore candidate. Do not bypass it.
4. Before uploading, sideload `dist/syncstep-2.6.apk` on the Seeker and run: Wallet tab,
   Connect Solana Wallet, approve in Seed Vault (connection, then the sign-in message), see
   `Connected · ABCD…WXYZ` and the 20 SYNC welcome airdrop, then tap **Disconnect wallet** and
   confirm it returns to `not connected`. If Connect fails, stop and report the exact message; do not submit.
5. Check the server is no longer bot-blocked: `apps/syncstep/scripts/check-server.sh 10`
   must print `blocked=0`. If not, the Namecheap ticket (sent 2026-09-30 from
   richducat@gmail.com to support@namecheap.com) is still pending. Do not submit yet:
   reviewers would hit the same "unable to connect server".
6. Submit, either way:
   - Browser: publish.solanamobile.com, SyncStep, New Version, upload `dist/syncstep-2.6.apk`,
     paste "What's new" and the testing notes from `apps/syncstep/RELEASE-NOTES.md`, then
     approve the Arweave upload and Release NFT signatures with publisher wallet
     `9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn`.
   - CLI: `DAPP_STORE_API_KEY=... SYNCSTEP_PUBLISHER_KEYPAIR=/path/publisher.json apps/syncstep/scripts/release.sh --skip-build --submit`
7. Report back: the signed APK SHA-256, the cert digest, and the submission status shown in
   the portal. Reviews take 3 to 5 business days; status comes from
   publishersupport@dappstore.solanamobile.com.

## Do not
- Sign with a different key, reuse versionCode 18 or lower, or edit `www/assets/*.js` by hand.
- Submit while `check-server.sh` still reports blocked requests.
