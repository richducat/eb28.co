from __future__ import annotations

import argparse
import os
import time

from ops.fundmanager.config import load_config
from ops.fundmanager.state import load_state, save_state, summarize_state, to_public_snapshot


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Publish a public-safe fundmanager dashboard snapshot.")
    parser.add_argument(
        "--state-path",
        default=os.environ.get("FUNDMANAGER_STATE_PATH", "ops/state/fundmanager-state.json"),
        help="Path to read the full orchestrator state from.",
    )
    parser.add_argument(
        "--output-path",
        default=os.environ.get("FUNDMANAGER_PUBLIC_STATE_PATH", "ops/state/fundmanager-public.json"),
        help="Path to write the public dashboard snapshot to.",
    )
    parser.add_argument("--config", help="Path to a JSON config override.")
    parser.add_argument("--run-once", action="store_true", help="Refresh once and exit.")
    return parser


def refresh(config_path: str | None, state_path: str, output_path: str) -> None:
    config = load_config(config_path)
    state = load_state(state_path)
    summarize_state(state, config)
    include_recent_actions = int(config.get("global", {}).get("public_snapshot_include_recent_actions", 12))
    public_state = to_public_snapshot(state, include_recent_actions=include_recent_actions)
    save_state(output_path, public_state)


def main() -> int:
    args = build_parser().parse_args()
    config = load_config(args.config)
    interval_seconds = max(30, int(config.get("global", {}).get("public_refresh_seconds", 60)))

    while True:
        refresh(args.config, args.state_path, args.output_path)
        print(f"wrote {args.output_path}")
        if args.run_once:
            return 0
        time.sleep(interval_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
