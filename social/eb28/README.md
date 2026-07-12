# EB28 social automation system

This directory documents the EB28-owned social lanes. Account state is time-sensitive; the read-only audit is the source of truth for connectivity, while the repository is the source of truth for copy, feature coverage, visual briefs, and safety gates.

## Active lanes

| Lane | Schedule | Output | Public mutation |
| --- | --- | --- | --- |
| EB28 Twice Daily Content Engine | 6:00 AM and 6:00 PM America/New_York | Article-led Facebook, Instagram, LinkedIn, X, and short-form drafts plus a feature spotlight | No. Every package stays `draft_only`. |
| Bluechip daily tape pack | 8:15 AM America/New_York via `ai.eb28.marketing.daily` | Real 24-hour tape facts, one rotating product feature, platform copy, four-slide carousel, vertical, and landscape assets; delivered to Telegram | No. Telegram is an internal handoff, not a public post. |
| EB28 Social Connection Audit | Daily in GitHub Actions | Read-only proof of Buffer account, organization, channel IDs, ownership, pause, disconnect, and lock state | No. The command reports `mutationCount: 0`. |
| EB28 Organic Growth Automation | Manual GitHub workflow | Content generation, validation, and asset preparation | No Buffer publish step. |
| Reddit opportunity watcher | Hourly via `ai.eb28.marketing.redditwatch` | Relevant discussion alerts | No Reddit post or reply. |

## Source of truth

- `content/eb28/social-features.json` is the active feature catalog. Business-growth and trading-software stay in separate lanes.
- `scripts/eb28-content-engine.mjs` writes article-led, platform-specific drafts and selects a relevant business feature.
- `scripts/generate-bluechip-daily.py` writes real-tape Bluechip/Desk OS drafts and rotates trading-product features.
- `scripts/lib/eb28-social-visuals.mjs` renders the shared visual system.
- `scripts/publish-eb28-buffer.mjs --verify` performs the fail-closed Buffer connection audit.
- `scripts/publish-eb28-buffer.mjs --prepare` renders assets. `--publish` remains separately gated and refuses `draft_only` packages.

## Visual output contract

Every current creative package renders:

- four opaque JPEG carousel slides at 1080×1350;
- one opaque JPEG vertical asset at 1080×1920;
- one opaque JPEG landscape asset at 1200×675.

The carousel narrative is cover → operating path → feature spotlight → measurement/CTA. One slide carries one focal idea, text stays readable at feed size, and generic office stock imagery is not used.

## Copy contract

- Facebook: problem, three-step plan, feature proof, and owned next step.
- Instagram: save-worthy diagnostic, numbered path, feature spotlight, measurement, and a small relevant hashtag set.
- LinkedIn: operator lesson, concrete build sequence, and soft product connection.
- X: concise operating insight under 280 characters plus the canonical guide.
- Short-form: 20–60 second beat sheet with timing, visuals, voiceover, on-screen text, and disclosure where required.
- Bluechip/Desk OS: no income claims, performance promises, fake urgency, or Robinhood affiliation claims; degraded and no-trade states stay visible.

## Commands

```bash
npm run check:eb28-social
npm run eb28:social:prepare -- --package output/eb28-social/eb28-content-YYYY-MM-DD-am.json
npm run eb28:social:verify
npm run bluechip:social:dry-run
```

`eb28:social:verify` requires the EB28-scoped Buffer API key, expected account, organization ID, exact channel map, and platform allowlist. Never substitute a different Buffer workspace when it fails.

## Connection snapshot from 2026-07-12

- Instagram `@eb28co` exists with one public post.
- TikTok `@eb28co` exists with one public post.
- X `@eb28co` does not exist.
- Facebook and LinkedIn are not present in the verified EB28 Buffer configuration.
- The available local Buffer API token belongs to the Free Chatbot Builder account, and the signed-in Chrome workspace belongs to another brand, so neither is a valid EB28 mutation path.
- The public profile identity is internally inconsistent: the bio positions `@eb28co` as Desk OS, while the only visible post markets a generic AI receptionist. Choose the account architecture before reconnecting or publishing.

## Required decision before live publishing

1. Decide whether `@eb28co` is the umbrella EB28 account or a trading-software account. The cleaner recommendation is to keep business-growth and trading-software on separate handles because the audiences, claims, and conversion paths are materially different.
2. Supply an EB28-scoped Buffer API token for the chosen account. The API identity must match `social@eb28.co`; never reuse the Free Chatbot Builder token.
3. Set the exact organization ID, channel IDs, and platform allowlist for only the EB28-owned profiles, then run `npm run eb28:social:verify` until it returns `connection_verified_read_only` and `mutationCount: 0`.
4. Align the selected profile name, bio, link, pinned post, and first-grid narrative with that decision before authorizing any package for external publishing.

Treat this snapshot as historical evidence only. Use the read-only audit for current state.
