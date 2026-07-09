#!/usr/bin/env python3
"""Sunday weekly recap: aggregate the week's tape pages into a blog post.

Reads the same desk journal that powers docs/tape/, builds one article for
the Monday–Sunday week just ended, appends it to content/eb28/articles.json,
and runs the existing blog engine (scripts/generate-eb28-blog.mjs) so the
post ships with the blog's own conventions: sections/faqs/citations schema,
FAQ + BlogPosting JSON-LD, sitemap, RSS/JSON feeds.

Fail-closed: stale/missing snapshot or journal aborts; the rendered article
page must pass scripts/compliance_lint.py or articles.json is rolled back
and nothing is committed.

Usage:
  generate-tape-weekly-recap.py                      # most recent Sunday
  generate-tape-weekly-recap.py --week-ending 2026-07-05
  generate-tape-weekly-recap.py ... --no-push

Runs via launchd label ai.eb28.tape.weekly (Sunday 17:00 ET).
"""
import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from eb28_growth_lib import (  # noqa: E402
    DOCS, ET, GateError, REPO, SITE_ORIGIN,
    fmt_display_date, fmt_weekday, git_publish, is_market_day,
    lint_or_die, load_journal_days, load_snapshot,
)

ARTICLES_FILE = REPO / "content" / "eb28" / "articles.json"
BLOG_ENGINE = REPO / "scripts" / "generate-eb28-blog.mjs"
NODE_CANDIDATES = [
    Path.home() / ".nvm/versions/node/v22.22.0/bin/node",
    Path("/opt/homebrew/bin/node"),
    Path("/usr/local/bin/node"),
]


def find_node():
    for candidate in NODE_CANDIDATES:
        if candidate.exists():
            return str(candidate)
    return shutil.which("node") or "node"


def most_recent_sunday(today):
    return today - timedelta(days=(today.weekday() + 1) % 7)


def week_days(week_ending, journal_days):
    monday = week_ending - timedelta(days=6)
    out = []
    for i in range(7):
        d = (monday + timedelta(days=i)).isoformat()
        if d in journal_days and is_market_day(d):
            out.append(journal_days[d])
    return out


def build_article(week_ending, days):
    monday = week_ending - timedelta(days=6)
    friday = week_ending - timedelta(days=2)
    span = f"{monday.strftime('%B %-d')} – {friday.strftime('%B %-d, %Y')}"
    slug = f"bluechip-desk-week-in-review-{week_ending.isoformat()}"

    cycles = sum(d["cycles"] for d in days)
    reviewed = sum(d["reviewed"] for d in days)
    placed = sum(d["placed"] for d in days)
    symbols = []
    for d in days:
        for s in d["symbols"]:
            if s not in symbols:
                symbols.append(s)
    live_any = any(d["live"] for d in days)
    mode = "live" if live_any else "review-only (paper) mode"

    day_bullets = [
        f"{fmt_weekday(d['date'])}, {fmt_display_date(d['date'])} — {d['cycles']} cycles, "
        f"{d['reviewed']} setups reviewed, {d['placed']} orders placed"
        f"{' (' + ', '.join(d['symbols'][:4]) + ')' if d['symbols'] else ''}"
        for d in days
    ]

    if symbols:
        flagged_para = (
            f"Across the week the desk flagged dips in {', '.join(symbols)} — {reviewed} individual "
            f"setups in total, each one prepared as a small $5 fractional order and sent to Robinhood's "
            f"broker-side review step. Because the desk runs in {mode}, that is where each one stopped: "
            f"prepared, journaled, and not placed. The point of the beta is the record, not the volume."
        )
    else:
        flagged_para = (
            "No dip crossed the desk's threshold this week, so it prepared nothing — five sessions of "
            "scanning, journaling, and deliberately doing nothing. We publish those weeks too, because a "
            "desk that only reports its busy weeks is running a highlight reel, not a tape."
        )

    internal_links = [
        {"label": "The Tape, Daily archive", "href": "/tape/",
         "reason": "One page per market day — every number in this recap links back to a daily shift report."},
        {"label": "The live fund dashboard", "href": "/fundmanager/",
         "reason": "The same desk, updated every few minutes, warnings and all."},
        {"label": "Answers: trading-bot questions without the hype", "href": "/answers/",
         "reason": "Safety, legality, scams, track records — plain-English answers backed by this tape."},
        {"label": "Bluechip, the desk behind the tape", "href": "/bluechip/",
         "reason": "What the software is, what it costs, and what it deliberately does not promise."},
    ]
    for d in days[:2]:
        internal_links.append({
            "label": f"Shift report: {fmt_display_date(d['date'])}",
            "href": f"/tape/{d['date']}/",
            "reason": "A full day of journal entries, exactly as recorded.",
        })

    return {
        "slug": slug,
        "title": f"The Tape, Weekly: Bluechip Desk Recap for {span}",
        "description": (
            f"Weekly recap from the public tape: {cycles} cycles, {reviewed} setups reviewed, "
            f"{placed} orders placed across {len(days)} market days ({span}). Every number links to "
            f"a daily shift report anyone can audit."
        ),
        "cluster": "desk-transparency",
        "primaryKeyword": "public trading tape weekly recap",
        "datePublished": week_ending.isoformat(),
        "author": "EB28",
        "heroLabel": "Weekly tape recap",
        "sourceRunId": f"tape-weekly-{week_ending.isoformat()}",
        "summary": (
            f"What the Bluechip desk actually did during the week of {span}: every cycle, every setup "
            f"reviewed, every order placed — and the quiet stretches in between — aggregated from the "
            f"daily shift reports on the public tape."
        ),
        "sections": [
            {
                "heading": "The week in numbers",
                "body": [
                    f"Between {span}, the Bluechip desk ran {cycles} cycles across {len(days)} market "
                    f"days, reviewed {reviewed} dip setups on its eight-name watchlist, and placed "
                    f"{placed} orders. The desk operated in {mode} all week." if not live_any else
                    f"Between {span}, the Bluechip desk ran {cycles} cycles across {len(days)} market "
                    f"days, reviewed {reviewed} dip setups on its eight-name watchlist, and placed "
                    f"{placed} orders.",
                    "These are journal counts, not marketing numbers. Every figure below is aggregated "
                    "from the desk's own journal — the same file the operator reads — and each day links "
                    "to a full shift report where the individual entries are printed in order.",
                ],
                "bullets": day_bullets,
            },
            {
                "heading": "What the desk flagged",
                "body": [
                    flagged_para,
                    "A review entry records the moment a watched name dipped past the desk's threshold: "
                    "the signal, the quote context at that second, the order it drafted, and the broker-side "
                    "checks that ran. Reading a handful of them is the fastest way to understand the desk's "
                    "temperament — start with any daily page in the archive.",
                ],
            },
            {
                "heading": "Why we publish the boring weeks",
                "body": [
                    "Most trading products show you their best week. We publish every week, because the "
                    "whole argument for Bluechip is the record: a desk you can audit before you believe "
                    "anything we say about it. Quiet weeks, degraded-status warnings, and zeros in the "
                    "'placed' column are part of that record, not blemishes on it.",
                    "The standard caveats are part of the record too. Bluechip is licensed software that "
                    "you install and operate — not investment advice, not a fund, not a financial service. "
                    "Trading involves risk of loss, and you can lose money, including everything you put in. "
                    "Past activity on this tape is a record, not a prediction of future results. Robinhood "
                    "does not endorse or sponsor EB28 or Bluechip.",
                ],
            },
        ],
        "faqs": [
            {
                "question": "Where do these weekly numbers come from?",
                "answer": (
                    "From the desk's own journal file, aggregated by the same script that renders the "
                    "daily pages at eb28.co/tape. Nothing is hand-edited between the journal and this post."
                ),
            },
            {
                "question": "Why were no orders placed this week?" if placed == 0 else
                            "How are placed orders reviewed?",
                "answer": (
                    "The desk runs in review-only mode during the public beta: it prepares real orders "
                    "through Robinhood's official Agentic Trading API and stops at the broker-side review "
                    "step, so every decision is journaled with zero execution. That is deliberate — the "
                    "beta exists to build a record, not volume." if placed == 0 else
                    "Every order passes Robinhood's broker-side review step before it reaches the market, "
                    "and every one is journaled to the public tape, wins and losses in the same font."
                ),
            },
            {
                "question": "Is this recap investment advice?",
                "answer": (
                    "No. It is a factual report of what our own software did during one week, published "
                    "for transparency. We never recommend trades or predict outcomes, and trading always "
                    "involves risk of loss."
                ),
            },
        ],
        "citations": [
            {"label": "CFTC customer advisory: criminals' increasing use of generative AI in fraud",
             "url": "https://www.cftc.gov/LearnAndProtect/AdvisoriesAndArticles/AI_Fraud.html"},
            {"label": "FINRA investor insights",
             "url": "https://www.finra.org/investors/insights"},
            {"label": "SEC / Investor.gov alerts and bulletins",
             "url": "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins"},
        ],
        "relatedSlugs": [],
        "internalLinks": internal_links,
    }


def run_blog_engine():
    proc = subprocess.run(
        [find_node(), str(BLOG_ENGINE)],
        cwd=REPO, capture_output=True, text=True, timeout=300,
    )
    if proc.returncode != 0:
        raise GateError(f"blog engine failed:\n{proc.stderr.strip() or proc.stdout.strip()}")
    print(proc.stdout.strip())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--week-ending", help="Sunday of the week to recap (YYYY-MM-DD)")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args()

    today = datetime.now(ET).date()
    week_ending = (date.fromisoformat(args.week_ending) if args.week_ending
                   else most_recent_sunday(today))
    if week_ending.weekday() != 6:
        raise GateError(f"--week-ending must be a Sunday, got {week_ending} ({week_ending.strftime('%A')})")

    # ---- fail-closed gates ----
    load_snapshot()
    journal_days = load_journal_days()

    days = week_days(week_ending, journal_days)
    if not days:
        print(f"[skip] no market-day journal data for week ending {week_ending} — nothing to recap")
        return

    article = build_article(week_ending, days)

    articles = json.loads(ARTICLES_FILE.read_text())
    if any(a.get("slug") == article["slug"] for a in articles):
        print(f"[skip] recap already published: {article['slug']}")
        return

    # Lint the article source before it enters the pipeline.
    lint_or_die(f"weekly recap {article['slug']}", json.dumps(article, ensure_ascii=False))

    backup = ARTICLES_FILE.read_text()
    articles.append(article)
    ARTICLES_FILE.write_text(json.dumps(articles, indent=2, ensure_ascii=False) + "\n")

    try:
        run_blog_engine()
        rendered = (DOCS / "blog" / article["slug"] / "index.html").read_text()
        lint_or_die(f"rendered recap page {article['slug']}", rendered)
    except Exception:
        # Roll back so a blocked article never lingers in the content source.
        ARTICLES_FILE.write_text(backup)
        run_blog_engine()
        raise

    git_publish(
        ["content/eb28/articles.json", "docs/blog", "docs/sitemap.xml",
         "docs/data/eb28-blog-feed.json"],
        f"Weekly tape recap: week ending {week_ending}",
        push=not args.no_push,
    )
    print(f"[done] {article['slug']} → {SITE_ORIGIN}/blog/{article['slug']}/")


if __name__ == "__main__":
    try:
        main()
    except GateError as err:
        print(f"FAIL-CLOSED: {err}", file=sys.stderr)
        sys.exit(1)
