from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from ops.fundmanager.config import get_lane_policies, load_config
from ops.fundmanager.providers import DryRunProvider, load_provider
from ops.fundmanager.reliability import ReliabilityLayer
from ops.fundmanager.state import validate_state_payload
from ops.fundmanager.types import (
    REASON_MARKET_COOLDOWN,
    REASON_MIN_SHARES,
    REASON_TRANSIENT_RETRY_EXHAUSTED,
)

def _lane_policy(config: dict, lane_id: str):
    return next(policy for policy in get_lane_policies(config) if policy.lane_id == lane_id)


def _run_case(*, config: dict, now: datetime, scenario: dict, lane_state: dict, candidates: list[str], lane_id: str = 'fast-loop', retry_policy: dict | None = None) -> dict:
    provider = DryRunProvider(scenario)
    reliability = ReliabilityLayer(now_fn=lambda: now, sleep_fn=lambda _seconds: None)
    policy = _lane_policy(config, lane_id)
    candidate_markets = [provider.market_states[market_id] for market_id in candidates]
    result = reliability.execute_lane(
        provider=provider,
        wallet=provider.get_wallet_state(),
        limits=provider.get_platform_limits("polymarket"),
        lane_policy=policy,
        lane_state=lane_state,
        wallet_config=config["wallet"],
        retry_policy=retry_policy or config["global"],
        candidates=candidate_markets,
    )
    return {
        "result": {
            "market_id": result.market_id,
            "outcome": result.outcome,
            "reason_code": result.reason_code,
            "attempts": result.attempts,
            "details": result.details,
        },
        "quote_calls": provider.quote_calls,
        "submit_calls": provider.submit_calls,
    }


def _validate_configured_provider(config: dict) -> dict | None:
    module_path = os.environ.get("FUNDMANAGER_PROVIDER_MODULE")
    if not module_path:
        return None

    provider = load_provider(config)
    provider_builder = getattr(provider, "build_fundmanager_state", None) or getattr(provider, "get_fundmanager_state", None)
    if not callable(provider_builder):
        return {
            "name": "configured provider import",
            "passed": False,
            "module": module_path,
            "class": os.environ.get("FUNDMANAGER_PROVIDER_CLASS"),
            "error": "provider does not expose build_fundmanager_state()",
        }

    payload = provider_builder()
    validate_state_payload(payload, require_provider_fields=True)
    provider_health = payload.get("provider_health", {})
    api_key_present = bool(provider_health.get("preflight", {}).get("simmer_api_key", {}).get("present"))
    degraded = bool(payload.get("degraded"))
    return {
        "name": "configured provider import",
        "passed": api_key_present and not degraded,
        "module": module_path,
        "class": os.environ.get("FUNDMANAGER_PROVIDER_CLASS"),
        "degraded": degraded,
        "provider_health": provider_health.get("status"),
        "api_key_present": api_key_present,
        "lane_count": len(payload.get("lanes", {})),
    }


def run_validation() -> dict:
    config = load_config()
    now = datetime(2026, 3, 6, 12, 0, tzinfo=timezone.utc)
    cases = []

    min_shares_case = _run_case(
        config=config,
        now=now,
        scenario={
            "wallet": {"usdc_available": 75, "gas_available_native": 0.1},
            "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 10, "max_spread_bps": 200, "max_slippage_bps": 125}},
            "markets": [
                {
                    "market_id": "pm-small",
                    "slug": "small-order",
                    "venue": "polymarket",
                    "best_bid": 0.798,
                    "best_ask": 0.8,
                    "last_price": 0.799,
                }
            ],
        },
        lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
        candidates=["pm-small"],
    )
    cases.append(
        {
            "name": "min-share guard",
            "passed": min_shares_case["result"]["reason_code"] == REASON_MIN_SHARES and min_shares_case["submit_calls"] == 0,
            **min_shares_case,
        }
    )

    cooldown_case = _run_case(
        config=config,
        now=now,
        scenario={
            "wallet": {"usdc_available": 75, "gas_available_native": 0.1},
            "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
            "markets": [
                {
                    "market_id": "pm-cooldown",
                    "slug": "cooldown-market",
                    "venue": "polymarket",
                    "best_bid": 0.45,
                    "best_ask": 0.451,
                    "last_price": 0.4505,
                }
            ],
        },
        lane_state={
            "circuit_breaker": {"open": False},
            "market_cooldowns": {
                "pm-cooldown": {"until": "2026-03-06T12:30:00Z", "reason_code": REASON_MARKET_COOLDOWN}
            },
        },
        candidates=["pm-cooldown"],
    )
    cases.append(
        {
            "name": "cooldown skip",
            "passed": cooldown_case["result"]["reason_code"] == REASON_MARKET_COOLDOWN and cooldown_case["submit_calls"] == 0,
            **cooldown_case,
        }
    )

    rotation_case = _run_case(
        config=config,
        now=now,
        scenario={
            "wallet": {"usdc_available": 75, "gas_available_native": 0.1},
            "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
            "markets": [
                {
                    "market_id": "pm-blocked",
                    "slug": "blocked-market",
                    "venue": "kalshi",
                    "best_bid": 0.45,
                    "best_ask": 0.451,
                    "last_price": 0.4505,
                },
                {
                    "market_id": "pm-eligible",
                    "slug": "eligible-market",
                    "venue": "polymarket",
                    "best_bid": 0.499,
                    "best_ask": 0.5,
                    "last_price": 0.4995,
                },
            ],
            "filled_at": "2026-03-06T12:00:00Z",
        },
        lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
        candidates=["pm-blocked", "pm-eligible"],
    )
    cases.append(
        {
            "name": "route rotation",
            "passed": rotation_case["result"]["market_id"] == "pm-eligible" and rotation_case["submit_calls"] == 1,
            **rotation_case,
        }
    )

    retry_case = _run_case(
        config=config,
        now=now,
        scenario={
            "wallet": {"usdc_available": 75, "gas_available_native": 0.1},
            "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
            "markets": [
                {
                    "market_id": "pm-flaky",
                    "slug": "flaky-market",
                    "venue": "polymarket",
                    "best_bid": 0.499,
                    "best_ask": 0.5,
                    "last_price": 0.4995,
                }
            ],
            "submit_failures": {
                "pm-flaky": [
                    {"message": "timeout", "transient": True},
                    {"message": "timeout", "transient": True},
                    {"message": "timeout", "transient": True},
                ]
            },
        },
        lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
        candidates=["pm-flaky"],
        retry_policy={"transient_retry_attempts": 2, "retry_backoff_seconds": 0, "retry_backoff_cap_seconds": 0},
    )
    cases.append(
        {
            "name": "capped transient retry",
            "passed": retry_case["result"]["reason_code"] == REASON_TRANSIENT_RETRY_EXHAUSTED and retry_case["submit_calls"] == 2,
            **retry_case,
        }
    )

    watch_case = _run_case(
        config=config,
        now=now,
        scenario={
            "wallet": {"usdc_available": 75, "gas_available_native": 0.1},
            "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
            "markets": [
                {
                    "market_id": "pm-watch",
                    "slug": "watch-market",
                    "venue": "polymarket",
                    "best_bid": 0.499,
                    "best_ask": 0.5,
                    "last_price": 0.4995,
                }
            ],
        },
        lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
        candidates=["pm-watch"],
        lane_id="divergence",
    )
    cases.append(
        {
            "name": "watch-only lane",
            "passed": watch_case["result"]["outcome"] == "watched" and watch_case["submit_calls"] == 0,
            **watch_case,
        }
    )

    provider_validation = _validate_configured_provider(config)
    if provider_validation is not None:
        cases.append(provider_validation)

    return {
        "generated_at": now.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "passed": all(case["passed"] for case in cases),
        "cases": cases,
    }


if __name__ == "__main__":
    print(json.dumps(run_validation(), indent=2))
