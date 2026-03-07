from __future__ import annotations

import argparse
import json
import os
import time

from ops.fundmanager import FundManagerOrchestrator, load_config


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the eb28 fundmanager live orchestrator.")
    parser.add_argument("--config", help="Path to a JSON config override.")
    parser.add_argument(
        "--state-path",
        default=os.environ.get("FUNDMANAGER_STATE_PATH", "ops/state/fundmanager-state.json"),
        help="Path to write the orchestrator state JSON.",
    )
    parser.add_argument("--run-once", action="store_true", help="Run a single cycle and exit.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    config = load_config(args.config)
    orchestrator = FundManagerOrchestrator(config=config, state_path=args.state_path)
    cycle_interval = max(60, int(config.get("global", {}).get("cycle_interval_minutes", 10)) * 60)

    while True:
        state = orchestrator.run_cycle()
        print(json.dumps({"generated_at": state.get("generated_at"), "summary": state.get("summary", {})}, indent=2))
        if args.run_once:
            return 0
        time.sleep(cycle_interval)


if __name__ == "__main__":
    raise SystemExit(main())
