from __future__ import annotations

import unittest
from datetime import datetime, timezone

from ops.fundmanager.config import load_config
from ops.fundmanager.providers import DryRunProvider
from ops.fundmanager.reliability import ReliabilityLayer
from ops.fundmanager.types import (
    REASON_MARKET_COOLDOWN,
    REASON_MIN_SHARES,
    REASON_TRANSIENT_RETRY_EXHAUSTED,
)


class ReliabilityLayerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 3, 6, 12, 0, tzinfo=timezone.utc)
        self.config = load_config()
        self.wallet = DryRunProvider(
            {
                "wallet": {"usdc_available": 100, "gas_available_native": 0.2},
                "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
            }
        ).get_wallet_state()
        self.limits = DryRunProvider(
            {
                "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
            }
        ).get_platform_limits("polymarket")
        policies = __import__("ops.fundmanager.config", fromlist=["get_lane_policies"]).get_lane_policies(self.config)
        self.policy = next(policy for policy in policies if policy.lane_id == "fast-loop")
        self.watch_policy = next(policy for policy in policies if policy.lane_id == "divergence")
        self.layer = ReliabilityLayer(now_fn=lambda: self.now, sleep_fn=lambda _seconds: None)

    def test_min_share_guard_skips_small_order(self) -> None:
        provider = DryRunProvider(
            {
                "wallet": {"usdc_available": 100, "gas_available_native": 0.2},
                "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 10, "max_spread_bps": 200, "max_slippage_bps": 125}},
                "markets": [
                    {
                        "market_id": "pm-small",
                        "slug": "small",
                        "venue": "polymarket",
                        "best_bid": 0.798,
                        "best_ask": 0.8,
                        "last_price": 0.795,
                    }
                ],
            }
        )
        lane_state = {"circuit_breaker": {"open": False}, "market_cooldowns": {}}
        result = self.layer.execute_lane(
            provider=provider,
            wallet=provider.get_wallet_state(),
            limits=provider.get_platform_limits("polymarket"),
            lane_policy=self.policy,
            lane_state=lane_state,
            wallet_config=self.config["wallet"],
            retry_policy=self.config["global"],
            candidates=provider.get_lane_candidates("fast-loop", 1) or [provider.market_states["pm-small"]],
        )
        self.assertEqual(result.reason_code, REASON_MIN_SHARES)
        self.assertEqual(result.outcome, "skipped")
        self.assertEqual(provider.submit_calls, 0)

    def test_cooldown_skip_avoids_submit(self) -> None:
        provider = DryRunProvider(
            {
                "wallet": {"usdc_available": 100, "gas_available_native": 0.2},
                "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
                "markets": [
                    {
                        "market_id": "pm-cooldown",
                        "slug": "cooldown",
                        "venue": "polymarket",
                        "best_bid": 0.45,
                        "best_ask": 0.451,
                        "last_price": 0.455,
                    }
                ],
            }
        )
        lane_state = {
            "circuit_breaker": {"open": False},
            "market_cooldowns": {
                "pm-cooldown": {"until": "2026-03-06T12:30:00Z", "reason_code": REASON_MARKET_COOLDOWN}
            },
        }
        result = self.layer.execute_lane(
            provider=provider,
            wallet=provider.get_wallet_state(),
            limits=provider.get_platform_limits("polymarket"),
            lane_policy=self.policy,
            lane_state=lane_state,
            wallet_config=self.config["wallet"],
            retry_policy=self.config["global"],
            candidates=[provider.market_states["pm-cooldown"]],
        )
        self.assertEqual(result.reason_code, REASON_MARKET_COOLDOWN)
        self.assertEqual(provider.submit_calls, 0)

    def test_rotation_skips_blocked_market_and_hits_next_candidate(self) -> None:
        provider = DryRunProvider(
            {
                "wallet": {"usdc_available": 100, "gas_available_native": 0.2},
                "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
                "markets": [
                    {
                        "market_id": "pm-locked",
                        "slug": "locked",
                        "venue": "kalshi",
                        "best_bid": 0.44,
                        "best_ask": 0.46,
                        "last_price": 0.45,
                    },
                    {
                        "market_id": "pm-open",
                        "slug": "open",
                        "venue": "polymarket",
                        "best_bid": 0.499,
                        "best_ask": 0.5,
                        "last_price": 0.495,
                    },
                ],
            }
        )
        result = self.layer.execute_lane(
            provider=provider,
            wallet=provider.get_wallet_state(),
            limits=provider.get_platform_limits("polymarket"),
            lane_policy=self.policy,
            lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
            wallet_config=self.config["wallet"],
            retry_policy=self.config["global"],
            candidates=[provider.market_states["pm-locked"], provider.market_states["pm-open"]],
        )
        self.assertIn(result.outcome, {"filled", "submitted"})
        self.assertEqual(result.market_id, "pm-open")
        self.assertEqual(provider.submit_calls, 1)

    def test_transient_retry_is_capped(self) -> None:
        provider = DryRunProvider(
            {
                "wallet": {"usdc_available": 100, "gas_available_native": 0.2},
                "platform_limits": {"default": {"min_order_usd": 5, "min_shares": 5, "max_spread_bps": 200, "max_slippage_bps": 125}},
                "markets": [
                    {
                        "market_id": "pm-flaky",
                        "slug": "flaky",
                        "venue": "polymarket",
                        "best_bid": 0.499,
                        "best_ask": 0.5,
                        "last_price": 0.495,
                    }
                ],
                "submit_failures": {
                    "pm-flaky": [
                        {"message": "timeout", "transient": True},
                        {"message": "timeout", "transient": True},
                        {"message": "timeout", "transient": True},
                    ]
                },
            }
        )
        result = self.layer.execute_lane(
            provider=provider,
            wallet=provider.get_wallet_state(),
            limits=provider.get_platform_limits("polymarket"),
            lane_policy=self.policy,
            lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
            wallet_config=self.config["wallet"],
            retry_policy={"transient_retry_attempts": 2, "retry_backoff_seconds": 0, "retry_backoff_cap_seconds": 0},
            candidates=[provider.market_states["pm-flaky"]],
        )
        self.assertEqual(result.reason_code, REASON_TRANSIENT_RETRY_EXHAUSTED)
        self.assertEqual(result.outcome, "failed")
        self.assertEqual(provider.submit_calls, 2)

    def test_watch_only_lane_reports_watched_without_order_checks(self) -> None:
        provider = DryRunProvider(
            {
                "wallet": {"usdc_available": 100, "gas_available_native": 0.2},
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
            }
        )
        result = self.layer.execute_lane(
            provider=provider,
            wallet=provider.get_wallet_state(),
            limits=provider.get_platform_limits("polymarket"),
            lane_policy=self.watch_policy,
            lane_state={"circuit_breaker": {"open": False}, "market_cooldowns": {}},
            wallet_config=self.config["wallet"],
            retry_policy=self.config["global"],
            candidates=[provider.market_states["pm-watch"]],
        )
        self.assertEqual(result.outcome, "watched")
        self.assertEqual(provider.submit_calls, 0)


if __name__ == "__main__":
    unittest.main()
