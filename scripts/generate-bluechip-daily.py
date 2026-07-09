#!/usr/bin/env python3
"""Daily tape-to-content engine for Bluechip/Desk OS marketing.

Reads what the desks ACTUALLY did (Robinhood journal, sim tape, whale roster,
public fund snapshot), fills rotating on-brand post templates with the real
numbers — losses included — and:
  1. writes the day's post pack to output/bluechip-daily/YYYY-MM-DD.md
  2. sends it to Richard's Telegram via the openclaw CLI (post from your phone)

Compliance is baked into the templates: zero income claims, transparency-first,
Robinhood non-endorsement. Runs daily via launchd (ai.eb28.marketing.daily).
"""
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

HOME = Path.home()
REPO = HOME / "GITHUB/eb28.co"
OUT_DIR = REPO / "output/bluechip-daily"
RH_JOURNAL = HOME / ".openclaw/workspace-dev/skills/robinhood-equities/journal.jsonl"
TAPE = HOME / ".openclaw/workspace-dev/skills/prediction-trade-journal/data/trades.json"
ROSTER = HOME / ".openclaw/workspace-dev/runtime/whale_roster.json"
SNAPSHOT = REPO / "docs/data/fundmanager-public.json"
SESSION_STORE = HOME / ".openclaw/agents/main/sessions/sessions.json"

ET = timezone(timedelta(hours=-4))


def today_facts():
    now = datetime.now(ET)
    since = now - timedelta(hours=24)
    facts = {
        "date": now.strftime("%B %-d"),
        "cycles": 0, "reviews": 0, "placed": 0,
        "dip_names": [], "sim_fills": 0, "whales": 0,
    }
    # Robinhood desk activity (last 24h)
    if RH_JOURNAL.exists():
        for line in RH_JOURNAL.read_text().splitlines()[-500:]:
            try:
                e = json.loads(line)
            except Exception:
                continue
            at = e.get("at", "")
            try:
                ts = datetime.fromisoformat(at.replace("Z", "+00:00"))
            except Exception:
                continue
            if ts < since:
                continue
            if e.get("event") == "cycle":
                facts["cycles"] += 1
                facts["reviews"] += e.get("reviewed") or 0
                facts["placed"] += e.get("placed") or 0
            elif e.get("event") == "review" and e.get("symbol"):
                if e["symbol"] not in facts["dip_names"]:
                    facts["dip_names"].append(e["symbol"])
    # Sim tape fills (last 24h)
    if TAPE.exists():
        try:
            trades = json.loads(TAPE.read_text())
            trades = trades if isinstance(trades, list) else trades.get("trades", [])
            for t in trades[-300:]:
                ts_raw = t.get("created_at") or t.get("timestamp") or ""
                try:
                    ts = datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
                except Exception:
                    continue
                if ts >= since and (t.get("venue") == "sim"):
                    facts["sim_fills"] += 1
        except Exception:
            pass
    if ROSTER.exists():
        try:
            facts["whales"] = len(json.loads(ROSTER.read_text()).get("roster", []))
        except Exception:
            pass
    return facts


def build_pack(f):
    day = datetime.now(ET).timetuple().tm_yday
    dips = ", ".join(f["dip_names"][:4]) if f["dip_names"] else None
    watched = f"It flagged dips in {dips}." if dips else "No dip crossed its threshold — so it did nothing. Discipline is the feature."

    x_posts = [
        f"Yesterday on the tape: our stocks desk ran {f['cycles']} cycles, reviewed {f['reviews']} setups, placed {f['placed']}. {watched} Every decision is public, losses included: eb28.co/fundmanager",
        f"Wall Street calls your paycheck money “dumb money.” Our desk clocked {f['cycles']} shifts in the last 24h and wrote every decision down where anyone can read it. That’s the whole pitch: eb28.co/bluechip",
        f"Most trading bots show you a green screenshot. Ours shows you the tape — {f['cycles']} cycles, {f['reviews']} reviews, {f['sim_fills']} paper fills in 24h, wins AND losses, same font: eb28.co/fundmanager",
        f"The desk watched 8 blue-chip names all day yesterday. {watched} No FOMO, no revenge trades, no 3am doubts. Tools, not promises: eb28.co/bluechip",
        f"Our copy desk tracks {f['whales']} vetted top traders — re-vetted every morning, dropped the moment they go cold. All of it runs on paper first, on a public tape: eb28.co/fundmanager",
        f"{f['reviews']} setups reviewed in 24h. {f['placed']} orders placed. If that ratio sounds boring, good — boring is what discipline looks like. Watch it live: eb28.co/fundmanager",
    ]
    x_post = x_posts[day % len(x_posts)]

    ig = (
        f"Yesterday’s shift report, straight off the public tape: {f['cycles']} cycles, "
        f"{f['reviews']} setups reviewed, {f['placed']} placed. {watched} "
        f"We publish everything — losses included — because tools should show their work. "
        f"Live beta, $98 founding license, link in bio. Trading involves risk of loss; software, not advice. "
        f"#dumbmoney #retailtrading #buildinpublic #tradingtools #transparency"
    )

    video = (
        f"HOOK (2s): “Here’s everything our trading desk did yesterday. Everything.”\n"
        f"SCRIPT: [Screen-record eb28.co/fundmanager scrolling] “{f['cycles']} cycles. "
        f"{f['reviews']} setups reviewed. {f['placed']} orders placed. "
        f"{'It flagged ' + dips + '.' if dips else 'Nothing crossed its threshold, so it did nothing — on purpose.'} "
        f"No highlights reel. No green-screenshot cherry-picking. The whole tape is public, losses included, "
        f"because that’s what a tool that respects your paycheck looks like. Link in bio. "
        f"Not financial advice — it’s software you run, and trading has risk.”"
    )

    return f"""# Bluechip daily post pack — {f['date']}

_Numbers below are pulled from the real tape (last 24h). Post in 5 minutes:_

## X / Threads / Bluesky
{x_post}

## Instagram / TikTok caption
{ig}

## Short-form video (30s)
{video}

---
_Rules: never edit toward an income claim. If a number looks wrong, check eb28.co/fundmanager first._
"""


def resolve_telegram_target():
    try:
        store = json.loads(SESSION_STORE.read_text())
    except Exception:
        return None
    candidates = []
    items = store.get("sessions") if isinstance(store, dict) else None
    if isinstance(items, list):
        for it in items:
            key = str(it.get("key") or "")
            if ":telegram:direct:" in key:
                candidates.append((int(it.get("updatedAt") or 0), key.rsplit(":", 1)[-1]))
    elif isinstance(store, dict):
        for key, it in store.items():
            if isinstance(it, dict) and ":telegram:direct:" in str(key):
                candidates.append((int(it.get("updatedAt") or 0), str(key).rsplit(":", 1)[-1]))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


def send_telegram(text):
    target = resolve_telegram_target()
    if not target:
        return False
    for bin_path in (HOME / ".openclaw/bin/openclaw", Path("/usr/local/bin/openclaw"), Path("/opt/homebrew/bin/openclaw")):
        if bin_path.exists():
            try:
                subprocess.run(
                    [str(bin_path), "message", "send", "--channel", "telegram",
                     "--target", target, "--message", text[:3800]],
                    capture_output=True, timeout=30,
                )
                return True
            except Exception:
                return False
    return False


def main():
    facts = today_facts()
    pack = build_pack(facts)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{datetime.now(ET).strftime('%Y-%m-%d')}.md"
    out.write_text(pack)
    sent = send_telegram("\U0001F4E3 Today's Bluechip post pack is ready:\n\n" + pack)
    print(f"pack written: {out}")
    print(f"telegram: {'sent' if sent else 'no session — pack on disk only'}")


if __name__ == "__main__":
    main()
