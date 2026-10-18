# EB28 jobs outside GitHub Actions

Commands installed under `~/hermes-handoff/bin`, with private logs and JSON receipts under the same handoff workspace:

* `eb28-organic-growth --dry-run [--slot auto|am|pm]` previews the original content engine. Without `--dry-run`, it runs the existing generation, Buffer package preparation, SEO checks and explicit-path commit/push. It does not send posts or email. The former workflow was already manual; no duplicate daily schedule was introduced. Optional external SEO review is not ported yet.
* `eb28-social-audit` runs the unchanged read-only account/channel verification locally. The same verifier is installed on Namecheap in a private directory. Its visual dependency is now loaded only when preparing creatives, so the host audit needs no npm dependencies. Host cron checks the original 13:15 UTC slot across DST and emits `audit-result.json`.
* `eb28-social-delivery --package /absolute/package.json` performs preflight; `--reconcile` reconciles existing receipts. The existing GitHub state branch and reservation-before-provider-write rules are preserved. `--send` requires Richard's explicit send authorization for the package. This migration did not send any posts. The account-specific Buffer key must exist in private jobs.env; the GitHub API state token is read transiently from authenticated gh CLI and never saved.
* `eb28-fundmanager-refresh` records the existing disabled state. It never invokes the generator. The original schedule was removed April 26 after private/internal data exposure; migrating infrastructure does not authorize reopening that publishing path.

The account-specific `BUFFER_API_KEY` currently exists only in encrypted GitHub secrets. It cannot be exported by the GitHub API. No other Buffer account's key was substituted. Host and Mac files for restored credentials must be private; host `jobs.env` was verified as 0600 in a 0700 directory.

Public `eb28.co` still resolves to GitHub Pages (185.199.108-111.153); its authoritative registrar-servers.com DNS is outside the approved cPanel hosting connector. A verified Namecheap static release and an approved registrar DNS API route are required before claiming the site is off Pages/Actions. Pages remains enabled until that cutover is verified.
