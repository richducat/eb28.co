# EB28 Mission Control

One window that shows every AI job you have running, what is finished, and what is waiting on you. Underneath it, a small workforce of agents that keeps the board honest all day and runs the business automations that are safe to run.

```
mission-control/
  electron/     desktop shell (window, tray badge, native notifications)
  src/
    sources/    scanners: Claude Code, Codex, Gemini CLI, OpenClaw cron, Hermes open loops, GitHub PRs, tracked-by-hand jobs, automation runs
    jobs/       the job model and the status rules
    board.js    merges scanners + your overrides into the five columns
    workforce/  orchestrator, agents, automation registry + runner, optional Claude access
    server.js   local HTTP + SSE API (127.0.0.1 only)
  ui/           the app screen (plain HTML/CSS/JS, no build step)
  automations.json  the allow-list of business commands and their safety tier
  bin/          CLI: scan | web | digest | agents | automations
  test/         node --test suite with transcript fixtures
```

## Run it

```bash
cd mission-control
npm install            # electron + optional @anthropic-ai/sdk
npm start              # desktop app
# or, with zero installs:
npm run web            # same UI in your browser at http://127.0.0.1:47831
npm run scan           # one-shot text view of the board
npm test
```

State lives in `~/.eb28-mission-control/` (override with `MC_HOME`). Nothing leaves your machine unless you add credentials.

## The board

| Column | Meaning |
|---|---|
| Needs you | An agent asked a question, is waiting for a permission, a PR wants review, a proposal wants approval |
| Working now | A session process is alive or its transcript changed in the last 3 minutes |
| Follow up | Quiet for hours while unfinished, stopped mid tool call, a paused cron, a stale or conflicted PR |
| Done | Finished in the last 3 days |
| Failed | The agent or automation reported an error |

Click a card for the last exchange, the exact resume command (`claude --resume …`, `codex resume …`), and one-click actions: mark done, needs me, snooze, archive, note. Your overrides stick until the underlying session produces newer activity, then the scanner's truth wins again.

**Where the data comes from**

- Claude Code: `~/.claude/projects/**/*.jsonl` plus the live pid registry in `~/.claude/sessions/`
- Codex: `~/.codex/sessions/**/rollout-*.jsonl` (both the `session_meta`/`event_msg` and legacy formats)
- Gemini CLI: `~/.gemini/tmp/*/chats/session-*.json`
- OpenClaw: `openclaw cron list --json` (falls back to `~/.openclaw/cron/jobs.json`)
- Hermes: `~/.hermes/personal-assistant/working-context/OPEN_LOOPS.md` (or `OPEN_LOOPS_PATH`)
- GitHub: open PRs when `GITHUB_TOKEN` and `MC_GITHUB_REPOS=owner/repo,owner/repo2` are set
- Bots and always-on agents (Grok/xAI bots, Dot, trading bots, schedulers): see **Bots** below
- Anything else: "+ Track a job" (Claude web chats, ChatGPT, Cursor, a contractor)

Override any path with `MC_CLAUDE_DIR`, `MC_CODEX_DIR`, `MC_GEMINI_DIR`, `MC_OPENCLAW_HOME`.

## Bots

The **Bots** tab shows every long-running bot or agent, with its AI provider, whether it is up, its last log lines, and a Restart button. It finds them on its own from:

- **pm2**: every process in `pm2 jlist`, with its logs and restart count
- **launchd** (macOS): your `~/Library/LaunchAgents/*.plist` jobs that use an AI provider
- **Docker**: containers whose name, image, or command points at an AI provider
- **Running processes** whose command line matches `MC_BOT_KEYWORDS` (default `grok|xai`)

The provider (Grok, Claude, OpenAI, Gemini) is detected from the name, the command line, and the bot's own script (for example `api.x.ai` or `XAI_API_KEY` means Grok). Set `MC_BOTS_ALL=1` to also list launchd/Docker jobs with no AI provider.

Anything it cannot see (Dot, a bot on another machine, a hosted bot with a health URL) you add with **+ Add a bot**. That writes `~/.eb28-mission-control/bots.json`:

```json
[
  { "name": "Dot", "provider": "dot", "process": "dot-agent\\.py", "log": "~/agents/dot/out.log", "expected": true },
  { "name": "Grok X reply bot", "provider": "grok", "match": "pm2:grok-reply", "autoRestart": true },
  { "name": "Grok trend API", "provider": "grok", "health": "https://example.com/health", "restart": ["pm2", "restart", "grok-trend"] }
]
```

| Status | When |
|---|---|
| Working | Running and logging |
| Needs you | Running, but its newest log line is an error (401, 429, a Python traceback…) |
| Follow up | Running but silent longer than `staleAfterMin` (default 60), or stopped with no expectation set |
| Failed | Crashed, crash-looping, health check failing, or marked `expected` and not running |

Restarts only use pm2, launchctl, docker, systemctl, node, python3, bash, or npm, and always as an argv list.

## The workforce

Eight agents run on an in-process scheduler. Each is a plain module in `src/workforce/agents/` with `run(ctx)`.

| Agent | Tier | Cadence | Job |
|---|---|---|---|
| Triage | observe | 2 min | Detects status changes, fires notifications, writes the one-line "what this needs from you" |
| Bot Watchdog | act | 5 min | Restarts down bots you allowed (max 3 an hour); asks before restarting the rest |
| Ops Runner | act | 1 min | Runs safe automations on schedule, files approval requests for approval-tier ones |
| Follow-up | propose | 15 min | Lists stalled work with the exact resume command |
| PR Steward | observe | 10 min | Flags conflicts and stale AI-authored PRs |
| Reporter | observe | 08:00, 17:00 | Writes the briefing (Briefing tab, `npm run digest`) |
| Automation Scout | propose | 09:15 | Finds package scripts and workflows not yet in the registry and rates their risk |
| Janitor | act | 03:30 | Expires snoozes, archives old done items, trims logs |

Pause the whole workforce, or any single agent, from the Workforce tab. `npm run agents -- run triage` runs one from the CLI.

**Claude is optional.** With `ANTHROPIC_API_KEY` (or an `ant auth login` profile) and `npm install`, Triage and Reporter use Claude for the explanations and briefing prose. Without it they use templates and everything else is identical. Set `MC_LLM=off` to force templates, `MC_MODEL` to pick a model. Every Claude answer is cached by job and activity time so nothing is billed twice.

## Automations and the safety tiers

`automations.json` is the allow-list. Every entry is an argv array (never a shell string), a working directory inside the repo, and a tier:

- **safe**: read-only or idempotent local work. Runs unattended on its schedule. The seeded ones are the repo's `check:*` scripts, the social delivery test suite, the fund manager validator, the lead-ops workbench refresh.
- **approval**: writes files, commits, or spends credits (content engine, SEO review, blog rebuild, site build, social prepare). Ops Runner asks in the Approvals panel. "Approve once" runs it now; "Approve as standing" lets it run on schedule from then on.
- **manual**: touches customers, money, email, or the public (social publish, outreach send, fund manager publish). Only the button runs it, after a confirmation, or the CLI with `--yes`.

Runs are logged with output; the latest run of each automation also appears on the board so a failing job is impossible to miss. The Scout proposes new entries; adopting one adds it to `~/.eb28-mission-control/custom-automations.json` with the tier you choose.

## If a command "does not run"

- Mission Control reads your login shell's PATH at startup (plus Homebrew, nvm, Volta, `~/.local/bin`), so `npm`, `node`, `claude`, `codex`, and `openclaw` resolve even when the app is launched from the Dock. If a tool still is not found, the run fails with a message naming it. Add its folder to your shell PATH and relaunch.
- The **Run** button writes the resume command to `~/.eb28-mission-control/last-run.command` and asks Terminal to run it in a login shell. macOS will ask once to let Mission Control control Terminal. If that is denied, use **Copy**.
- Every automation run keeps its full output under "Last output" on the Automations tab.

## Packaging

`npm run dist` builds a DMG/zip (macOS), NSIS installer (Windows), or AppImage (Linux) with electron-builder.

## Arcade

A live Super Mario World style archipelago of the whole operation, drawn in code (no image
assets). Drag to explore, scroll to zoom, double-click an island to fly to it, or use the
buttons and minimap.

- **Main island:** the status landmarks (Needs You castle, Workshop, Follow-up post office,
  Goal, Ghost House), HQ for the workforce, the clock tower, the Bot Fortress and Hermes Village.
- **The Backrooms** (west): one big liminal-office island where all coders and office work
  live, with a department per company (TYFYS, EB28, Inspection, Apps, General).
- **The Fun Park** (east): a theme park with **one ride per app** (LabStudio, SnapGrid,
  ParentPath, CadetCatch, SyncStep, MicroFit, TeslaHelper, CosmicChat, Inspection Rent, the
  TYFYS app, Tech Kombat, Content Factory, Day Trading Bot) plus the Content Studio for social
  and creative work. Apps come from `src/apps.js`, overridable in `~/.eb28-mission-control/apps.json`.
- **Mech Island** (south): a cyberpunk machine city with code rain, the Bot Fortress, the mech
  hangar, and **the Eye** on a golden pyramid that tracks whatever needs you and beams across
  every island. Each island has a **warden mech** that patrols and scans it.
- Tourists, office drones and netrunners wander their islands; boats and gulls cross the sea.
- Agents walk the bridges to the main island when they need you, finish or fail. Click an
  island's sign (or double-click the island) to fly in and get its directory in the sidebar.
- **Overlords:** each Hermes chief-of-staff profile patrols its realm and checks in on every job;
  the crowned Grand Chief of Staff makes rounds of the overlords.
- **The Watchdog** is a war mech: it hauls failed agents to the Ghost House and stomps over to
  bots that are down.
- Characters are original pixel archetypes in the style of the Fund Manager agents grid; Grok bots
  are aliens and the Hermes gateway is a gold messenger. Click anyone for a portrait card.
- **Wall Street** (north): a New York trading island reached by a bridge from the main island:
  the NYSE facade with its columns and flag, an LED ticker with your watched totals, the Charging
  Bull, yellow cabs, hot-dog carts and steam vents. Every trading desk (bot or agent) stands on
  the floor in a jacket colored by its kill-switch state, and **the opening bell is the master kill
  switch**: green "HALTED · SAFE" while trading is off, flashing red if it is ever on. A
  compliance mech patrols the island. Nothing on this island can trade.

**Dot (OG Kush)** wears the leaf hat. By default Dot is any Codex thread handed over by voice
(`<realtime_delegation>`). Pick a different bot or Hermes profile with "Who is Dot?" on the tab.

## Trading (watch-only)

The **Trading** tab and Wall Street island show trading bots, wallets and prediction-market
positions. They are **read-only by design**:

- No buy, sell, swap, send, redeem or "enable live" control exists. Wallets are added by public
  address only; Mission Control never holds private keys or seed phrases and never signs anything.
- **Kill switches** are visible and ON by default. A desk whose state can't be confirmed counts as
  unsafe. Turning the master switch off needs Touch ID plus a typed phrase and is refused in a
  plain browser. Turning it back on is one click (also from the bell's sidebar card).
- Trading bots are on a denylist in `src/workforce/bot-control.js`: Mission Control and the
  watchdog will not restart them.
- Data comes from public Solana/Polygon RPCs (read methods only, allowlisted), the public
  Polymarket data API, Jupiter prices, and local bot ledgers opened read-only.
- Secrets (RPC URLs with keys, API keys) live only in the macOS Keychain under the service
  `co.eb28.missioncontrol.trading`; the tab shows which names are present and the command to add
  one. They never appear in JSON state, logs, events or error messages.
- Personal settings (watched addresses, account names, checklist) live in
  `~/.eb28-mission-control/trading.json`, never in this repo.
- The approvals queue only **records** decisions about risky changes (Touch ID + typed phrase for
  risky ones); it executes nothing.

## iPhone app

`ios/` is a SwiftUI app (iOS 17+) for answering agents, chatting with a chief of staff,
watching trading and the TYFYS pipeline from your phone.

- **Pairing:** on the Mac click **📱 Phone**, turn on phone access and scan the code with the app.
  Phone access is off until you turn it on, works on the same Wi-Fi, and is HTTPS with a
  certificate the phone pins from the code, plus a pairing token (kept in the iPhone Keychain).
  **New code** unpairs every phone.
- **What the phone can do** (`src/mobile.js` allowlist): read the board, answer and approve
  agents, Hermes decisions, chief-of-staff chat, mark done / snooze, restart a non-trading bot,
  run an automation, and turn the trading kill switch **on**. It can never turn the kill
  switch off, approve trading changes, change settings, or open things on the Mac.
- **Build:** `brew install xcodegen`, then `cd ios && xcodegen generate` and open the project.
  `ios/scripts/testflight.sh` archives and uploads to TestFlight with an App Store Connect API key.

## More

- **TYFYS tab:** the Zoho CRM deal pipeline grouped into lanes (Onboarding, Intake, Evaluation,
  Provider/DBQs, Claim, Appeal, Stalled) with overdue flags per stage, KPIs, bottlenecks and owner
  load. Read from `~/.eb28-mission-control/tyfys-pipeline.json` (initials only, no veteran details).
- **Fuel:** Codex weekly limit and credits, Claude token activity, Grok (via Hermes quota cache),
  local Qwen. Fuel Depot tanks on Mech Island and a card on Home.
- **Ask your Chief of Staff:** message a Hermes chief of staff from Home or the Arcade; it runs on
  the free local model and shows up on the map while it works.
- **Replay:** the Arcade records every status change; replay today on the map.
- **Weather and night:** each island's sky shows its health; day/night follows your clock.
