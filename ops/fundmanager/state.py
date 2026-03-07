from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from .reliability import isoformat, parse_iso, utcnow
from .types import (
    LANE_STATUS_DEGRADED,
    LANE_STATUS_PAUSED,
    LANE_STATUS_RUNNING,
    ORDER_OUTCOME_FAILED,
    ORDER_OUTCOME_FILLED,
    ORDER_OUTCOME_SKIPPED,
    ORDER_OUTCOME_SUBMITTED,
    ORDER_OUTCOME_WATCHED,
    REASON_LANE_DISABLED,
    REASON_WATCH_ONLY,
)

NON_BLOCKER_REASON_CODES = {
    REASON_LANE_DISABLED,
    REASON_WATCH_ONLY,
}


def load_state(state_path: str | Path) -> dict:
    path = Path(state_path)
    if not path.exists():
        return {
            "generated_at": None,
            "summary": {},
            "lanes": {},
            "recent_actions": [],
        }

    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_state(state_path: str | Path, payload: dict) -> None:
    path = Path(state_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
    tmp_path.replace(path)


def initialize_lane_state(policy) -> dict:
    return {
        "id": policy.lane_id,
        "name": policy.name,
        "mode": policy.mode,
        "status": LANE_STATUS_PAUSED if policy.mode == "disabled" else LANE_STATUS_DEGRADED,
        "last_cycle_at": None,
        "last_reason_code": None,
        "last_error_class": None,
        "last_successful_fill_at": None,
        "next_action": "await_next_cycle",
        "consecutive_failures": 0,
        "metrics": {
            "filled": 0,
            "submitted": 0,
            "skipped": 0,
            "failed": 0,
            "watched": 0,
        },
        "reason_metrics": {},
        "market_cooldowns": {},
        "recent_events": [],
        "circuit_breaker": {
            "open": False,
            "open_until": None,
            "threshold": policy.failure_circuit_threshold,
            "cooloff_minutes": policy.failure_circuit_cooloff_minutes,
        },
    }


def ensure_lane_state(state: dict, policy) -> dict:
    lanes = state.setdefault("lanes", {})
    lane_state = lanes.get(policy.lane_id)
    if lane_state is None:
        lane_state = initialize_lane_state(policy)
        lanes[policy.lane_id] = lane_state
    return lane_state


def prune_market_cooldowns(lane_state: dict, now_iso: str) -> None:
    now = parse_iso(now_iso)
    cooldowns = lane_state.get("market_cooldowns", {})
    for market_id, details in list(cooldowns.items()):
        until = parse_iso(details.get("until"))
        if until and now and until <= now:
            cooldowns.pop(market_id, None)


def increment_reason_metric(lane_state: dict, reason_code: str | None) -> None:
    if not reason_code:
        return
    reason_metrics = lane_state.setdefault("reason_metrics", {})
    reason_metrics[reason_code] = int(reason_metrics.get(reason_code, 0)) + 1


def append_lane_event(lane_state: dict, *, now_iso: str, message: str, payload: dict | None = None, limit: int = 12) -> None:
    events = lane_state.setdefault("recent_events", [])
    entry = {"timestamp": now_iso, "message": message}
    if payload:
        entry["details"] = payload
    events.insert(0, entry)
    del events[limit:]


def append_recent_action(state: dict, *, now_iso: str, message: str, lane_id: str | None = None, payload: dict | None = None, limit: int = 24) -> None:
    actions = state.setdefault("recent_actions", [])
    entry = {"timestamp": now_iso, "message": message}
    if lane_id:
        entry["lane_id"] = lane_id
    if payload:
        entry["details"] = payload
    actions.insert(0, entry)
    del actions[limit:]


def set_market_cooldown(lane_state: dict, market_id: str, *, until: str, reason_code: str) -> None:
    lane_state.setdefault("market_cooldowns", {})[market_id] = {
        "until": until,
        "reason_code": reason_code,
    }


def note_result(lane_state: dict, result, *, now_iso: str) -> None:
    lane_state["last_cycle_at"] = now_iso
    lane_state["status"] = result.status
    lane_state["last_reason_code"] = result.reason_code

    metrics = lane_state.setdefault("metrics", {})
    if result.outcome == ORDER_OUTCOME_FILLED:
        metrics["filled"] = int(metrics.get("filled", 0)) + 1
        lane_state["last_successful_fill_at"] = result.filled_at or now_iso
        lane_state["consecutive_failures"] = 0
        lane_state["last_error_class"] = None
        lane_state["next_action"] = "evaluate_next_cycle"
    elif result.outcome == ORDER_OUTCOME_SUBMITTED:
        metrics["submitted"] = int(metrics.get("submitted", 0)) + 1
        lane_state["consecutive_failures"] = 0
        lane_state["last_error_class"] = None
        lane_state["next_action"] = "await_fill_or_next_cycle"
    elif result.outcome == ORDER_OUTCOME_WATCHED:
        metrics["watched"] = int(metrics.get("watched", 0)) + 1
        lane_state["consecutive_failures"] = 0
        lane_state["last_error_class"] = None
        lane_state["next_action"] = "watch_only_monitoring"
    elif result.outcome == ORDER_OUTCOME_SKIPPED:
        metrics["skipped"] = int(metrics.get("skipped", 0)) + 1
        lane_state["last_error_class"] = None if not result.transient else "transient_skip"
        lane_state["next_action"] = "rotate_market" if result.market_id else "await_next_cycle"
    elif result.outcome == ORDER_OUTCOME_FAILED:
        metrics["failed"] = int(metrics.get("failed", 0)) + 1
        lane_state["consecutive_failures"] = int(lane_state.get("consecutive_failures", 0)) + 1
        lane_state["last_error_class"] = "transient" if result.transient else "hard_failure"
        lane_state["next_action"] = "cool_off_then_retry" if result.transient else "manual_review"

    increment_reason_metric(lane_state, result.reason_code)


def maybe_trip_circuit_breaker(lane_state: dict, policy, *, now_iso: str) -> bool:
    failures = int(lane_state.get("consecutive_failures", 0))
    threshold = int(policy.failure_circuit_threshold)
    if failures < threshold:
        return False

    circuit = lane_state.setdefault("circuit_breaker", {})
    if circuit.get("open"):
        return True

    open_until = isoformat(parse_iso(now_iso) or utcnow())
    open_until = isoformat((parse_iso(open_until) or utcnow()).replace())  # keep normalized
    # The caller should overwrite this with a lane-specific cool-off timestamp.
    circuit["open"] = True
    circuit["open_until"] = open_until
    lane_state["status"] = LANE_STATUS_PAUSED
    lane_state["next_action"] = "resume_after_cooloff"
    return True


def resume_circuit_breaker_if_elapsed(lane_state: dict, *, now_iso: str) -> None:
    circuit = lane_state.get("circuit_breaker", {})
    if not circuit.get("open"):
        return

    now = parse_iso(now_iso)
    open_until = parse_iso(circuit.get("open_until"))
    if now and open_until and now >= open_until:
        circuit["open"] = False
        circuit["open_until"] = None
        lane_state["consecutive_failures"] = 0
        lane_state["status"] = LANE_STATUS_DEGRADED
        lane_state["next_action"] = "retry_after_cooloff"


def summarize_state(state: dict, config: dict) -> dict:
    lane_items = list(state.get("lanes", {}).values())
    blocker_counts = {}
    active_lanes = 0
    running_active_lanes = 0
    degraded_active_lanes = 0
    paused_active_lanes = 0
    last_successful_fill_at = None

    for lane in lane_items:
        if lane.get("mode") == "active":
            active_lanes += 1
            if lane.get("status") == LANE_STATUS_RUNNING:
                running_active_lanes += 1
            elif lane.get("status") == LANE_STATUS_PAUSED:
                paused_active_lanes += 1
            else:
                degraded_active_lanes += 1

        fill_at = lane.get("last_successful_fill_at")
        if fill_at and (last_successful_fill_at is None or fill_at > last_successful_fill_at):
            last_successful_fill_at = fill_at

        for reason_code, count in lane.get("reason_metrics", {}).items():
            if reason_code in NON_BLOCKER_REASON_CODES:
                continue
            blocker_counts[reason_code] = blocker_counts.get(reason_code, 0) + int(count)

    if active_lanes == 0 or paused_active_lanes == active_lanes:
        status = LANE_STATUS_PAUSED
    elif degraded_active_lanes > 0 or running_active_lanes == 0:
        status = LANE_STATUS_DEGRADED
    else:
        status = LANE_STATUS_RUNNING

    top_blockers = [
        {"reason_code": reason_code, "count": count}
        for reason_code, count in sorted(blocker_counts.items(), key=lambda item: (-item[1], item[0]))[:5]
    ]

    summary = {
        "status": status,
        "cycle_interval_minutes": int(config.get("global", {}).get("cycle_interval_minutes", 10)),
        "active_lanes": active_lanes,
        "top_blockers": top_blockers,
        "last_successful_fill_at": last_successful_fill_at,
    }
    state["summary"] = summary
    return summary


def to_public_snapshot(state: dict, *, include_recent_actions: int = 12) -> dict:
    public_state = deepcopy(state)
    public_state["recent_actions"] = public_state.get("recent_actions", [])[:include_recent_actions]
    return public_state


def validate_state_payload(payload: dict, *, require_provider_fields: bool = False) -> None:
    if not isinstance(payload, dict):
        raise ValueError("fundmanager payload must be a dict")

    for key in ("generated_at", "summary", "lanes", "recent_actions"):
        if key not in payload:
            raise ValueError(f"fundmanager payload missing `{key}`")

    summary = payload.get("summary")
    if not isinstance(summary, dict):
        raise ValueError("fundmanager payload summary must be a dict")

    for key in ("status", "cycle_interval_minutes", "active_lanes", "top_blockers", "last_successful_fill_at"):
        if key not in summary:
            raise ValueError(f"fundmanager payload summary missing `{key}`")

    lanes = payload.get("lanes")
    if not isinstance(lanes, dict):
        raise ValueError("fundmanager payload lanes must be a dict")

    for lane_id, lane in lanes.items():
        if not isinstance(lane, dict):
            raise ValueError(f"lane `{lane_id}` must be a dict")
        for key in (
            "id",
            "name",
            "mode",
            "status",
            "last_cycle_at",
            "last_reason_code",
            "last_error_class",
            "last_successful_fill_at",
            "next_action",
            "consecutive_failures",
            "metrics",
            "reason_metrics",
            "market_cooldowns",
            "recent_events",
            "circuit_breaker",
        ):
            if key not in lane:
                raise ValueError(f"lane `{lane_id}` missing `{key}`")

    recent_actions = payload.get("recent_actions")
    if not isinstance(recent_actions, list):
        raise ValueError("fundmanager payload recent_actions must be a list")

    if not require_provider_fields:
        return

    for key in ("provider_health", "last_success_ts", "reason_codes", "degraded"):
        if key not in payload:
            raise ValueError(f"provider payload missing `{key}`")

    if not isinstance(payload.get("provider_health"), dict):
        raise ValueError("provider payload provider_health must be a dict")
    if not isinstance(payload.get("reason_codes"), list):
        raise ValueError("provider payload reason_codes must be a list")
