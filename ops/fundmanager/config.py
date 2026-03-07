from __future__ import annotations

import json
import os
from pathlib import Path

from .types import LanePolicy

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "fundmanager.default.json"


def _deep_merge(base: dict, override: dict) -> dict:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_config(config_path: str | None = None) -> dict:
    override_path = config_path or os.environ.get("FUNDMANAGER_CONFIG")
    with DEFAULT_CONFIG_PATH.open("r", encoding="utf-8") as handle:
        config = json.load(handle)

    if override_path:
        with Path(override_path).expanduser().resolve().open("r", encoding="utf-8") as handle:
            override = json.load(handle)
        config = _deep_merge(config, override)

    return config


def get_lane_policies(config: dict) -> list[LanePolicy]:
    global_config = config.get("global", {})
    lanes = config.get("lanes", {})
    allowed_venues = tuple(global_config.get("allowed_venues", ["polymarket"]))

    policies = []
    for lane_id, lane_config in lanes.items():
        policies.append(
            LanePolicy(
                lane_id=lane_id,
                name=str(lane_config.get("name", lane_id.replace("-", " ").title())),
                mode=str(lane_config.get("mode", "disabled")),
                priority=int(lane_config.get("priority", 100)),
                order_usd=float(lane_config.get("order_usd", 0.0)),
                allowed_venues=tuple(lane_config.get("allowed_venues", allowed_venues)),
                target_rotation=bool(lane_config.get("target_rotation", True)),
                candidate_limit=int(lane_config.get("candidate_limit", 3)),
                market_cooldown_minutes=int(lane_config.get("market_cooldown_minutes", 30)),
                failure_cooldown_minutes=int(
                    lane_config.get(
                        "failure_cooldown_minutes",
                        global_config.get("failure_cooldown_minutes", 30),
                    )
                ),
                failure_circuit_threshold=int(
                    lane_config.get(
                        "failure_circuit_threshold",
                        global_config.get("failure_circuit_threshold", 3),
                    )
                ),
                failure_circuit_cooloff_minutes=int(
                    lane_config.get(
                        "failure_circuit_cooloff_minutes",
                        global_config.get("failure_circuit_cooloff_minutes", 30),
                    )
                ),
                default_side=str(lane_config.get("default_side", "buy")),
                max_bankroll_fraction=float(lane_config.get("max_bankroll_fraction", 0.0)),
            )
        )

    return sorted(policies, key=lambda policy: policy.priority)
