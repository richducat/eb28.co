# Desk OS / Bluechip profile setup

The trading-software profile is intentionally **not assigned to `@eb28co` yet**. The current Instagram and TikTok connections use that handle, but the public profile mixes a Desk OS bio with a business-automation post. `content/eb28/social-account-architecture.json` keeps publishing blocked until the handle role is approved.

## Recommended separation

- Keep `@eb28co` for EB28 business growth: free website builds, Growth Hosting, private AI, App Builder, Recon Agent, and lead automation.
- Choose a distinct owned handle for Bluechip / Desk OS, then verify availability and ownership before adding it to Buffer.
- Do not rename, reconnect, archive, or publish from either account until that mapping is approved.

Candidate trading handles are planning prompts only—not verified availability:

- `@bluechipbyeb28`
- `@eb28deskos`
- `@eb28bluechip`

## Trading profile copy after a handle is approved

### Instagram

**Display name:** Bluechip / Desk OS by EB28
**Bio:** Paper-first trading software behind a kill switch. Public tape, losses and no-trade days included. Software, not advice.
**Link:** `https://eb28.co/fundmanager/`

### TikTok

**Display name:** Bluechip by EB28
**Bio:** Paper-first trading software. Live tape, losses included. Software, not advice.
**Link:** `https://eb28.co/fundmanager/`

### X

**Display name:** Bluechip / Desk OS by EB28
**Bio:** Building paper-first trading software behind a kill switch. I publish the tape, including losses, errors, and no-trade days. Software, not a fund.
**Link:** `https://eb28.co/start`

### YouTube

**Channel name:** Bluechip / Desk OS by EB28
**Description:** Product walkthroughs, safety-control demonstrations, setup guides, and weekly public-tape reviews. Software, not investment advice; trading carries real risk of loss.
**Links:** `https://eb28.co/fundmanager/` and `https://eb28.co/bluechip/`

### LinkedIn

Use the founder profile until a distinct company page has enough recurring product material. Keep the founder disclosure visible and put product links in the Featured section or first comment when appropriate.

### Reddit / Hacker News

Use a personal builder identity with plain affiliation disclosure. Do not create a promotional EB28 persona, automate replies, or place checkout links where community rules prohibit them.

## First three pinned trading posts

1. **What Bluechip is—and is not:** paper-first licensed software, dedicated-account boundary, operator control, and risk disclosure.
2. **The off-switch is the product:** kill switch, capital guard, circuit breakers, and the decision journal.
3. **Read the tape before the pitch:** current lane states, inactivity, errors, fills, and unresolved blockers on the public proof surface.

## Unblock checklist

1. Approve the role of `@eb28co`.
2. Choose and verify the separate trading handle if the lanes are split.
3. Update `content/eb28/social-account-architecture.json` with `decision.status=approved`, the exact allowed lane, and the approved profile mapping.
4. Align display name, bio, link, avatar, pinned posts, and first-grid narrative.
5. Connect only the exact owned profiles and rerun `npm run eb28:social:verify`.
6. Keep every campaign `draft_only` until a separate package is explicitly authorized.

## Standing rule

Every trading bio, post, and caption must describe a software license, not investment advice; state real risk of loss; avoid income or return claims; and treat the live tape as operating evidence rather than a forecast.
