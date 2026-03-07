from __future__ import annotations

import argparse
import os
import shlex
import subprocess
import time
from pathlib import Path

from ops.fundmanager.reliability import parse_iso, utcnow
from ops.fundmanager.state import load_state


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Monitor fundmanager orchestrator state freshness.")
    parser.add_argument(
        "--state-path",
        default=os.environ.get("FUNDMANAGER_STATE_PATH", "ops/state/fundmanager-state.json"),
        help="Path to the orchestrator state file.",
    )
    parser.add_argument(
        "--stale-after-minutes",
        type=int,
        default=int(os.environ.get("FUNDMANAGER_STALE_AFTER_MINUTES", "25")),
        help="Flag stale state after this many minutes.",
    )
    parser.add_argument(
        "--check-interval-seconds",
        type=int,
        default=int(os.environ.get("FUNDMANAGER_WATCHDOG_INTERVAL_SECONDS", "60")),
        help="How often to check state freshness.",
    )
    parser.add_argument(
        "--restart-cmd",
        default=os.environ.get("FUNDMANAGER_WATCHDOG_RESTART_CMD"),
        help="Optional shell-safe command to run when state is stale.",
    )
    return parser


def maybe_restart(restart_cmd: str | None) -> None:
    if not restart_cmd:
        return
    subprocess.run(shlex.split(restart_cmd), check=False)


def is_stale(state_path: str, stale_after_minutes: int) -> tuple[bool, str]:
    path = Path(state_path)
    if not path.exists():
        return True, f"state file missing at {state_path}"

    state = load_state(state_path)
    generated_at = parse_iso(state.get("generated_at"))
    if generated_at is None:
        return True, "state has no generated_at timestamp"

    age_seconds = (utcnow() - generated_at).total_seconds()
    max_age_seconds = stale_after_minutes * 60
    if age_seconds > max_age_seconds:
        return True, f"state is stale ({int(age_seconds)}s > {max_age_seconds}s)"

    return False, "state fresh"


def main() -> int:
    args = build_parser().parse_args()
    while True:
        stale, message = is_stale(args.state_path, args.stale_after_minutes)
        print(message)
        if stale:
            maybe_restart(args.restart_cmd)
        time.sleep(max(10, args.check_interval_seconds))


if __name__ == "__main__":
    raise SystemExit(main())
