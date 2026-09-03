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
- Anything else: "+ Track a job" (Claude web chats, ChatGPT, Cursor, a contractor)

Override any path with `MC_CLAUDE_DIR`, `MC_CODEX_DIR`, `MC_GEMINI_DIR`, `MC_OPENCLAW_HOME`.

## The workforce

Seven agents run on an in-process scheduler. Each is a plain module in `src/workforce/agents/` with `run(ctx)`.

| Agent | Tier | Cadence | Job |
|---|---|---|---|
| Triage | observe | 2 min | Detects status changes, fires notifications, writes the one-line "what this needs from you" |
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

- **safe**: read-only or idempotent local work. Runs unattended on its schedule. The seeded ones are the repo's `check:*` scripts, the fund manager validator, the lead-ops workbench refresh.
- **approval**: writes files, commits, or spends credits (content engine, SEO review, blog rebuild, site build, social prepare). Ops Runner asks in the Approvals panel. "Approve once" runs it now; "Approve as standing" lets it run on schedule from then on.
- **manual**: touches customers, money, email, or the public (social publish, outreach send, fund manager publish). Only the button runs it, after a confirmation, or the CLI with `--yes`.

Runs are logged with output; the latest run of each automation also appears on the board so a failing job is impossible to miss. The Scout proposes new entries; adopting one adds it to `~/.eb28-mission-control/custom-automations.json` with the tier you choose.

## Packaging

`npm run dist` builds a DMG/zip (macOS), NSIS installer (Windows), or AppImage (Linux) with electron-builder.
