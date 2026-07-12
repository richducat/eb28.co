#!/usr/bin/env python3
"""Daily tape-to-content engine for Bluechip/Desk OS marketing.

Reads what the desks actually did, selects one current product feature from the
shared EB28 feature catalog, writes platform-specific draft copy, renders a
4:5 carousel plus 9:16 and 16:9 derivatives, and delivers the reviewed pack to
Richard's Telegram. It never posts to a public social account.

Compliance remains fail-closed: income claims, performance promises, and false
Robinhood affiliation language block both asset delivery and Telegram output.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

HOME = Path.home()
REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "output/bluechip-daily"
RH_JOURNAL = HOME / ".openclaw/workspace-dev/skills/robinhood-equities/journal.jsonl"
TAPE = HOME / ".openclaw/workspace-dev/skills/prediction-trade-journal/data/trades.json"
ROSTER = HOME / ".openclaw/workspace-dev/runtime/whale_roster.json"
SNAPSHOT = Path(os.environ.get("EB28_FUND_SNAPSHOT", REPO / "docs/data/fundmanager-public.json"))
FEATURE_CATALOG = REPO / "content/eb28/social-features.json"
ASSET_RENDERER = REPO / "scripts/render-eb28-social-assets.mjs"
SESSION_STORE = HOME / ".openclaw/agents/main/sessions/sessions.json"
ET = ZoneInfo("America/New_York")


def read_json(path, fallback):
    try:
        return json.loads(path.read_text())
    except Exception:
        return fallback


def clip(value, length):
    text = " ".join(str(value or "").split())
    if len(text) <= length:
        return text
    short = text[: max(0, length - 1)]
    boundary = short.rfind(" ")
    if boundary > length * 0.55:
        short = short[:boundary]
    return short.rstrip(".,;:!?-") + "…"


def today_facts(snapshot_path=SNAPSHOT):
    now = datetime.now(ET)
    since = now - timedelta(hours=24)
    facts = {
        "date": now.strftime("%B %-d"),
        "iso_date": now.strftime("%Y-%m-%d"),
        "cycles": 0,
        "reviews": 0,
        "placed": 0,
        "dip_names": [],
        "sim_fills": 0,
        "whales": 0,
        "status": "UNKNOWN",
        "active_lanes": 0,
        "top_blocker": "No current blocker summary available",
        "snapshot_updated_at": None,
        "bluechip_status": "UNKNOWN",
    }

    if RH_JOURNAL.exists():
        for line in RH_JOURNAL.read_text().splitlines()[-500:]:
            try:
                event = json.loads(line)
                timestamp = datetime.fromisoformat(str(event.get("at", "")).replace("Z", "+00:00"))
            except Exception:
                continue
            if timestamp < since:
                continue
            if event.get("event") == "cycle":
                facts["cycles"] += 1
                facts["reviews"] += event.get("reviewed") or 0
                facts["placed"] += event.get("placed") or 0
            elif event.get("event") == "review" and event.get("symbol"):
                if event["symbol"] not in facts["dip_names"]:
                    facts["dip_names"].append(event["symbol"])

    if TAPE.exists():
        tape_data = read_json(TAPE, [])
        trades = tape_data if isinstance(tape_data, list) else tape_data.get("trades", [])
        for trade in trades[-300:]:
            try:
                timestamp = datetime.fromisoformat(
                    str(trade.get("created_at") or trade.get("timestamp") or "").replace("Z", "+00:00")
                )
            except Exception:
                continue
            if timestamp >= since and trade.get("venue") == "sim":
                facts["sim_fills"] += 1

    if ROSTER.exists():
        facts["whales"] = len(read_json(ROSTER, {}).get("roster", []))

    snapshot = read_json(snapshot_path, {})
    summary = snapshot.get("summary") or {}
    facts["status"] = str(summary.get("status") or "UNKNOWN").upper()
    facts["active_lanes"] = int(summary.get("activeLanes") or 0)
    facts["snapshot_updated_at"] = snapshot.get("updatedAt")
    blockers = summary.get("topBlockers") or []
    if blockers:
        blocker = blockers[0]
        reason = str(blocker.get("reasonCode") or "UNKNOWN").replace("_", " ").title()
        facts["top_blocker"] = f"{reason} ({int(blocker.get('count') or 0)} lanes)"
    for lane in snapshot.get("lanes") or []:
        if str(lane.get("name") or "").lower() == "bluechip":
            facts["bluechip_status"] = str(lane.get("status") or "UNKNOWN").upper()
            break
    return facts


def load_trading_features():
    catalog = read_json(FEATURE_CATALOG, {})
    features = [
        feature
        for feature in catalog.get("features", [])
        if feature.get("lane") == "trading-software" and feature.get("status") != "retired"
    ]
    if not features:
        raise RuntimeError("No active trading-software features in content/eb28/social-features.json")
    return catalog, features


def build_package(facts, catalog, feature):
    day = datetime.now(ET).timetuple().tm_yday
    dips = ", ".join(facts["dip_names"][:4]) if facts["dip_names"] else None
    watched = (
        f"It flagged {dips}."
        if dips
        else "No setup crossed the desk's threshold, so it did nothing. Discipline is a feature."
    )
    status_line = (
        f"Public system status: {facts['status']}. {facts['active_lanes']} active lanes. "
        f"Top blocker: {facts['top_blocker']}."
    )
    activity_line = (
        f"Last 24 hours: {facts['cycles']} Bluechip cycles, {facts['reviews']} setups reviewed, "
        f"{facts['placed']} placed, and {facts['sim_fills']} paper fills across the wider desk."
    )
    compact_activity = (
        f"{facts['cycles']} cycles · {facts['reviews']} reviewed · {facts['placed']} placed · "
        f"{facts['sim_fills']} paper fills."
    )
    compact_status = f"System {facts['status']} · {facts['active_lanes']} active lanes · {facts['top_blocker']}."
    feature_points = list(feature.get("features") or [])
    while len(feature_points) < 3:
        feature_points.append("A visible operator control and an inspectable decision record")

    hooks = [
        "The hard part was never starting a trading agent. It was making the stop conditions obvious.",
        "No trade is still a decision — and the public tape should show it.",
        "A green screenshot is marketing. A live degraded state is evidence.",
        "The off-switch is the product. The agent is only one component.",
        "Paper mode is not a demo limitation. It is the first release gate.",
        "If the operator cannot explain what stops the desk, the desk is not ready.",
    ]
    hook = hooks[day % len(hooks)]
    risk_line = "Software, not investment advice. Trading carries real risk of loss."
    cta_url = feature.get("cta", {}).get("url") or "https://eb28.co/fundmanager/"

    x_caption = (
        f"{hook}\n\n{facts['cycles']} cycles / {facts['reviews']} reviews / {facts['placed']} placed. "
        f"{feature['name']}: {clip(feature_points[0], 72)}\n"
        f"Tape: eb28.co/fundmanager\nSoftware, not advice. Risk of loss."
    )
    if len(x_caption) > 280:
        x_caption = (
            f"{clip(hook, 92)}\n\n{facts['cycles']} cycles / {facts['reviews']} reviews / "
            f"{facts['placed']} placed. {clip(feature['name'], 35)}: {clip(feature_points[0], 50)}\n"
            "eb28.co/fundmanager · Software, not advice."
        )

    instagram_caption = (
        f"{hook}\n\n"
        f"TODAY'S TAPE\n{activity_line}\n{watched}\n\n"
        f"FEATURE FOCUS — {feature['name']}\n"
        f"01 · {feature_points[0]}\n"
        f"02 · {feature_points[1]}\n"
        f"03 · {feature_points[2]}\n\n"
        f"WHY IT MATTERS\n{feature['promise']}\n\n"
        f"{status_line}\n\n"
        f"Watch the tape or inspect the feature: {cta_url}\n"
        f"{risk_line}\n\n"
        "#BuildInPublic #TradingSoftware #AgenticAI #RiskControls #EB28"
    )

    linkedin_caption = (
        f"{hook}\n\n"
        f"The last 24 hours were not a highlight reel. {activity_line} {watched}\n\n"
        f"This is the feature I am documenting today: {feature['name']}.\n\n"
        f"• {feature_points[0]}\n"
        f"• {feature_points[1]}\n"
        f"• {feature_points[2]}\n\n"
        f"{status_line}\n\n"
        "The operating lesson: transparency has to include inactivity, blockers, and degraded states — not only fills. "
        f"See the public tape: https://eb28.co/fundmanager/\n\n{risk_line}\n\n"
        "#BuildInPublic #AgenticAI #TradingSystems"
    )

    beats = [
        {"seconds": "0-3", "visual": "Full-screen hook over the live tape", "voiceover": hook},
        {"seconds": "3-10", "visual": "Show the 24-hour activity counters", "voiceover": activity_line},
        {"seconds": "10-20", "visual": f"Open the {feature['name']} feature card", "voiceover": feature["promise"]},
        {"seconds": "20-31", "visual": "Animate three feature callouts", "voiceover": "; ".join(feature_points[:3])},
        {"seconds": "31-38", "visual": "Show live status and top blocker", "voiceover": status_line},
        {"seconds": "38-45", "visual": "End on public tape URL and disclosure", "voiceover": risk_line},
    ]
    short_caption = (
        f"{clip(hook, 120)} {feature['name']}: {clip(feature['promise'], 130)} "
        "Watch the unedited tape at eb28.co/fundmanager. "
        "#BuildInPublic #TradingSoftware #AgenticAI #EB28"
    )

    creative_system = {
        "version": catalog.get("version") or "2026-07-social-v2",
        "pillar": "Bluechip / Desk OS",
        "objective": "trust_through_transparency",
        "eyebrow": "DAILY TAPE NOTE",
        "headline": hook,
        "subhead": f"{compact_activity} {compact_status}",
        "theme": feature.get("visualTheme") or "bluechip",
        "feature": feature,
        "steps": [
            {"label": "Read the tape", "value": compact_activity},
            {"label": "Inspect the feature", "value": f"{feature['name']}: {feature_points[0]}"},
            {"label": "Check the guardrail", "value": compact_status},
        ],
        "metric": {
            "label": "Today's operating proof",
            "value": f"{facts['cycles']} cycles, {facts['reviews']} reviews, {facts['placed']} placed; status {facts['status']}.",
        },
        "cta": feature.get("cta") or {"label": "Watch the public tape", "url": "https://eb28.co/fundmanager/"},
        "disclaimer": risk_line,
    }

    return {
        "brand": "Bluechip by EB28",
        "generatedAt": datetime.now(ET).isoformat(),
        "runId": facts["iso_date"],
        "lane": "trading-software",
        "publishingPolicy": {
            "externalPublishing": "manual_review_required",
            "requiredState": "draft_only",
            "note": "Telegram delivery is an internal handoff. No public social post is created by this automation.",
        },
        "creativeStandards": {
            "version": catalog.get("version") or "2026-07-social-v2",
            "voice": "Anti-guru, technical but accessible, specific about controls, and honest about inactivity or degraded state.",
            "visual": "Four-slide 4:5 carousel plus 9:16 and 16:9 derivatives using live facts and one current feature.",
        },
        "facts": facts,
        "featureSpotlight": feature,
        "creativeSystem": creative_system,
        "posts": {
            "x": {"caption": x_caption, "status": "draft_only"},
            "instagram": {"caption": instagram_caption, "status": "draft_only"},
            "linkedin": {"caption": linkedin_caption, "status": "draft_only"},
            "shortFormVideo": {
                "hook": hook,
                "durationSeconds": 45,
                "beats": beats,
                "onScreenText": ["Today's tape", feature["name"], "The guardrail", "Software, not advice"],
                "caption": short_caption,
                "status": "draft_only",
            },
        },
    }


def render_assets(package_path, run_id):
    node_bin = shutil.which("node")
    if not node_bin:
        raise RuntimeError("Node.js is required to render the Bluechip social assets")
    command = [
        node_bin,
        str(ASSET_RENDERER),
        "--package",
        str(package_path),
        "--output-dir",
        str(OUT_DIR / "assets"),
        "--file-base",
        run_id,
    ]
    result = subprocess.run(command, cwd=REPO, capture_output=True, text=True, timeout=90)
    if result.returncode != 0:
        raise RuntimeError(f"Social asset renderer failed: {clip(result.stderr or result.stdout, 500)}")
    return read_json(package_path, {})


def build_markdown(package):
    posts = package["posts"]
    feature = package["featureSpotlight"]
    facts = package["facts"]
    assets = package.get("visualAssets") or {}
    carousel = assets.get("instagramCarousel") or []
    asset_lines = [f"- {asset.get('localPath')} ({asset.get('width')}×{asset.get('height')})" for asset in carousel]
    if assets.get("vertical"):
        asset_lines.append(f"- {assets['vertical'].get('localPath')} (9:16 vertical)")
    if assets.get("landscape"):
        asset_lines.append(f"- {assets['landscape'].get('localPath')} (16:9 landscape)")
    beats = "\n".join(
        f"- **{beat['seconds']}** — {beat['visual']}\n  - Voiceover: {beat['voiceover']}"
        for beat in posts["shortFormVideo"]["beats"]
    )
    return f"""# Bluechip daily post pack — {facts['date']}

_Real 24-hour tape facts + one current feature. Public posting remains manual._

## Feature spotlight

**{feature['name']}** — {feature['promise']}

## X / Threads / Bluesky

{posts['x']['caption']}

## Instagram / TikTok caption

{posts['instagram']['caption']}

## LinkedIn

{posts['linkedin']['caption']}

## Short-form video (45 seconds)

{beats}

**Caption:** {posts['shortFormVideo']['caption']}

## Ready-to-use assets

{chr(10).join(asset_lines)}

---
_Rules: never edit toward an income claim. Verify the public tape before posting. Software, not investment advice; trading carries real risk of loss._
"""


def resolve_telegram_target():
    store = read_json(SESSION_STORE, {})
    candidates = []
    items = store.get("sessions") if isinstance(store, dict) else None
    if isinstance(items, list):
        for item in items:
            key = str(item.get("key") or "")
            if ":telegram:direct:" in key:
                candidates.append((int(item.get("updatedAt") or 0), key.rsplit(":", 1)[-1]))
    elif isinstance(store, dict):
        for key, item in store.items():
            if isinstance(item, dict) and ":telegram:direct:" in str(key):
                candidates.append((int(item.get("updatedAt") or 0), str(key).rsplit(":", 1)[-1]))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return candidates[0][1]


def send_telegram(text, media_path=None):
    target = resolve_telegram_target()
    if not target:
        return False
    candidates = [
        shutil.which("openclaw"),
        str(HOME / ".openclaw/bin/openclaw"),
        "/usr/local/bin/openclaw",
        "/opt/homebrew/bin/openclaw",
    ]
    for candidate in candidates:
        if not candidate or not Path(candidate).exists():
            continue
        command = [candidate, "message", "send", "--channel", "telegram", "--target", target, "--message", text[:3600]]
        if media_path and Path(media_path).exists():
            command.extend(["--media", str(media_path)])
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=45)
            return result.returncode == 0
        except Exception:
            return False
    return False


def parse_args():
    parser = argparse.ArgumentParser(description="Generate the daily Bluechip social pack")
    parser.add_argument("--dry-run", action="store_true", help="Generate and validate locally without Telegram delivery")
    parser.add_argument("--no-telegram", action="store_true", help="Generate the pack but skip Telegram delivery")
    parser.add_argument("--snapshot", type=Path, default=SNAPSHOT, help="Override the fundmanager public snapshot path")
    return parser.parse_args()


def main():
    args = parse_args()
    facts = today_facts(args.snapshot)
    catalog, features = load_trading_features()
    day = datetime.now(ET).timetuple().tm_yday
    feature = features[day % len(features)]
    package = build_package(facts, catalog, feature)

    sys.path.insert(0, str(Path(__file__).parent))
    from compliance_lint import lint

    initial_payload = json.dumps(package, ensure_ascii=False)
    violations = lint(initial_payload)
    if violations:
        if not args.dry_run and not args.no_telegram:
            send_telegram("⚠️ Today's Bluechip pack was BLOCKED — nothing was published or delivered:\n" + "\n".join(violations[:5]))
        print("BLOCKED by compliance lint:")
        for violation in violations:
            print("  ✗", violation)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    package_path = OUT_DIR / f"{facts['iso_date']}.json"
    package_path.write_text(json.dumps(package, indent=2, ensure_ascii=False) + "\n")
    rendered_package = render_assets(package_path, facts["iso_date"])
    markdown = build_markdown(rendered_package)

    final_violations = lint(markdown + "\n" + json.dumps(rendered_package, ensure_ascii=False))
    if final_violations:
        print("BLOCKED after rendering by compliance lint:")
        for violation in final_violations:
            print("  ✗", violation)
        sys.exit(1)

    markdown_path = OUT_DIR / f"{facts['iso_date']}.md"
    markdown_path.write_text(markdown)
    cover_path = None
    carousel = (rendered_package.get("visualAssets") or {}).get("instagramCarousel") or []
    if carousel:
        cover_path = REPO / carousel[0]["localPath"]

    should_send = not args.dry_run and not args.no_telegram
    sent = send_telegram("📣 Today's Bluechip post pack is ready (copy + imagery + compliance checked):\n\n" + markdown, cover_path) if should_send else False
    print(f"pack written: {markdown_path}")
    print(f"package written: {package_path}")
    print(f"feature: {feature['id']}")
    print(f"assets: {len(carousel)} carousel + vertical + landscape")
    if should_send:
        print(f"telegram: {'sent' if sent else 'failed or no session — pack on disk only'}")
    else:
        print("telegram: skipped")


if __name__ == "__main__":
    main()
