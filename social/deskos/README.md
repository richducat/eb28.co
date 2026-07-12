# EB28 Desk OS — Social Content System

Platform-specific launch material for Desk OS and Bluechip. Every draft must be checked against the live tape before posting.

## Files
- **profiles.md** — the separate trading-profile recommendation, bios, pinned narrative, and unblock checklist. Do not apply it until the `@eb28co` role is approved.
- **x-twitter.md** — 6 threads + 25 standalone posts + bio + pinned tweet.
- **linkedin.md** — 8 posts + founder headline/about blurb.
- **reddit-hackernews.md** — 9 posts with per-sub posting rules (read these — Reddit removes promo).
- **short-form-video.md** — 12 TikTok/Reels/Shorts scripts (hook + shot list + caption + hashtags).
- **calendar-30day.md** — the launch arc: which post goes where, each day.
- `../../content/deskos/` — brand voice, hook bank, and the engine's data.
- `../../scripts/deskos-social-engine.mjs` — generate fresh posts on demand.
- `../../content/eb28/social-features.json` — current Bluechip, Desk OS, live-tape, and onboarding feature definitions.
- `../../scripts/generate-bluechip-daily.py` — daily real-tape pack, feature rotation, copy, imagery, compliance gate, and Telegram handoff.
- `../../scripts/generate-eb28-feature-campaign-library.mjs` — all-feature draft copy, video briefs, and image sets for both lanes.
- `../eb28/README.md` — full automation inventory, visual contract, connection audit, and current channel snapshot.

## The one rule that protects you
Never claim income, returns, "passive income," or guarantees. It's a **software license, not investment advice**, and trading carries **real risk of loss — including ours**. The whole brand is *"buy from people who show you the tape"* — the live page (eb28.co/fundmanager) showing real losses is the hook, not a P&L promise.

## Your links
- Hub (put in every bio): **eb28.co/start**
- Sales page: **eb28.co/deskos**
- Live tape (proof): **eb28.co/fundmanager**

## Daily workflow (15 min)
1. Open the current `output/bluechip-daily/YYYY-MM-DD.md` pack and compare its facts with `eb28.co/fundmanager`.
2. Use the matching feed, vertical, or landscape asset under `output/bluechip-daily/assets/YYYY-MM-DD/`.
3. Review the platform-specific caption and disclosure; do not rewrite toward a performance claim.
4. Post manually only from the verified EB28-owned account. On LinkedIn/Reddit, use a first-comment link when the community rules call for it.
5. Reply to useful comments while the thread is active. If the facts or channel identity cannot be verified, do not post.
6. Need more evergreen material? Run `node scripts/deskos-social-engine.mjs --count 10`.

## Publishing boundary

The daily automation delivers an internal draft pack to Telegram; it does not create a public post. The Buffer publisher must fail closed on the wrong account, organization, channel, paused queue, disconnected channel, locked channel, `draft_only` package, unresolved account architecture, or a package lane that is not approved for the selected profile.
