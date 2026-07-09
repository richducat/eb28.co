#!/usr/bin/env python3
"""Reddit opportunity watcher — read-only, no credentials, no posting.

Polls the public RSS feeds of trader subreddits for threads where a founder
reply would land well (Robinhood API, AI trading, bot-safety questions) and
Telegrams Richard a link so he can reply BY HAND within the golden hour.

Writing to Reddit is deliberately NOT automated: Reddit's Responsible Builder
Policy bans auto-posting and shadowbans repeated links to one domain. This
watcher exists so the manual habit takes 15 minutes instead of an hour of
scrolling. Runs hourly via launchd (ai.eb28.marketing.redditwatch).
"""
import json
import re
import subprocess
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HOME = Path.home()
STATE = HOME / "GITHUB/eb28.co/output/reddit-watcher-seen.json"
SESSION_STORE = HOME / ".openclaw/agents/main/sessions/sessions.json"

FEEDS = [
    "https://www.reddit.com/r/algotrading/new/.rss",
    "https://www.reddit.com/r/RobinHood/new/.rss",
    "https://www.reddit.com/r/Daytrading/new/.rss",
]
KEYWORDS = re.compile(
    r"robinhood\s+api|agentic|ai\s+trading|trading\s+bot|auto\s*trad|algo\s+bot|copy\s*trad|is\s+it\s+safe|paper\s+trad",
    re.I,
)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "eb28-reader/1.0 (read-only RSS)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def parse_entries(xml):
    entries = []
    for m in re.finditer(r"<entry>(.*?)</entry>", xml, re.S):
        block = m.group(1)
        title = re.search(r"<title>(.*?)</title>", block, re.S)
        link = re.search(r'<link href="([^"]+)"', block)
        if title and link:
            t = re.sub(r"&amp;", "&", re.sub(r"&#39;|&quot;", "'", title.group(1))).strip()
            entries.append((t, link.group(1)))
    return entries


def send_telegram(text):
    try:
        store = json.loads(SESSION_STORE.read_text())
    except Exception:
        return False
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
        return False
    candidates.sort(reverse=True)
    target = candidates[0][1]
    for bin_path in (HOME / ".openclaw/bin/openclaw", Path("/usr/local/bin/openclaw"), Path("/opt/homebrew/bin/openclaw")):
        if bin_path.exists():
            subprocess.run(
                [str(bin_path), "message", "send", "--channel", "telegram",
                 "--target", target, "--message", text[:3800]],
                capture_output=True, timeout=30,
            )
            return True
    return False


def main():
    seen = set()
    if STATE.exists():
        try:
            seen = set(json.loads(STATE.read_text())["seen"])
        except Exception:
            pass
    hits = []
    for feed in FEEDS:
        try:
            for title, link in parse_entries(fetch(feed)):
                if link in seen:
                    continue
                seen.add(link)
                if KEYWORDS.search(title):
                    sub = link.split("/r/")[1].split("/")[0] if "/r/" in link else "?"
                    hits.append(f"r/{sub}: {title}\n{link}")
        except Exception:
            continue
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"seen": list(seen)[-2000:], "at": datetime.now(timezone.utc).isoformat()}))
    if hits:
        msg = ("🎯 Reddit threads worth a founder reply (by hand, no links, disclose you built it):\n\n"
               + "\n\n".join(hits[:5]))
        send_telegram(msg)
        print(f"{len(hits)} hit(s) sent")
    else:
        print("no new hits")


if __name__ == "__main__":
    main()
