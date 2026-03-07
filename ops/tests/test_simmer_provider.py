from __future__ import annotations

import tempfile
import unittest
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from ops.fundmanager.config import load_config
from ops.fundmanager.reliability import isoformat
from ops.providers.simmer_provider import SimmerFundProvider


@dataclass
class FakeMarket:
    id: str
    question: str
    status: str
    current_probability: float
    import_source: str = "polymarket"
    external_price_yes: float | None = None
    divergence: float | None = None
    resolves_at: str | None = None
    is_live_now: bool | None = None
    spread_cents: float | None = None
    liquidity_tier: str | None = None


@dataclass
class FakePosition:
    market_id: str
    question: str
    shares_yes: float
    shares_no: float
    current_value: float
    pnl: float
    status: str
    venue: str = "polymarket"
    sim_balance: float | None = None
    cost_basis: float | None = None
    avg_cost: float | None = None
    current_price: float | None = None
    sources: list[str] | None = None


class FakeSimmerClient:
    def __init__(self, *, fail: bool = False):
        self.fail = fail

    def _maybe_fail(self):
        if self.fail:
            raise RuntimeError("Simmer unavailable")

    def get_portfolio(self):
        self._maybe_fail()
        return {"balance_usdc": 123.45, "total_exposure": 21.0}

    def get_positions(self):
        self._maybe_fail()
        return [
            FakePosition(
                market_id="mkt-fast-1",
                question="Will ETH finish green today?",
                shares_yes=14.0,
                shares_no=0.0,
                current_value=16.2,
                pnl=1.2,
                status="active",
                sources=["sdk:fast-loop"],
            )
        ]

    def get_open_orders(self):
        self._maybe_fail()
        return {
            "count": 1,
            "orders": [
                {
                    "id": "ord-1",
                    "market_id": "mkt-fast-1",
                    "status": "live",
                    "sources": ["sdk:fast-loop"],
                }
            ],
        }

    def get_markets(self, *, status: str = "active", limit: int = 50):
        self._maybe_fail()
        return [
            FakeMarket(
                id="mkt-fast-1",
                question="Will ETH finish green today?",
                status=status,
                current_probability=0.56,
                external_price_yes=0.56,
                is_live_now=True,
                spread_cents=2.0,
                liquidity_tier="tight",
            )
        ]

    def get_fast_markets(self, *, limit: int = 50):
        return self.get_markets(limit=limit)

    def get_market_context(self, market_id: str):
        self._maybe_fail()
        return {
            "market": {
                "id": market_id,
                "question": "Will ETH finish green today?",
                "status": "active",
                "external_price_yes": 0.56,
                "best_bid_yes": 0.55,
                "best_ask_yes": 0.57,
                "spread_cents": 2.0,
            }
        }


class SimmerFundProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.root = Path(self.temp_dir.name)
        self.state_path = self.root / "fundmanager-state.json"
        self.committee_path = self.root / "committee-state.json"
        self.cache_path = self.root / "provider-cache.json"
        self.now = datetime(2026, 3, 7, 12, 0, tzinfo=timezone.utc)
        self.config = load_config()

        self.state_path.write_text(
            """{
  "generated_at": "2026-03-07T11:55:00Z",
  "summary": {
    "status": "DEGRADED",
    "cycle_interval_minutes": 10,
    "active_lanes": 2,
    "top_blockers": [{"reason_code": "NO_ELIGIBLE_MARKET", "count": 1}],
    "last_successful_fill_at": null
  },
  "lanes": {
    "fast-loop": {
      "id": "fast-loop",
      "name": "Fast Loop",
      "mode": "active",
      "status": "DEGRADED",
      "last_cycle_at": "2026-03-07T11:55:00Z",
      "last_reason_code": "NO_ELIGIBLE_MARKET",
      "last_error_class": null,
      "last_successful_fill_at": null,
      "next_action": "await_next_cycle",
      "consecutive_failures": 0,
      "metrics": {"filled": 0, "submitted": 0, "skipped": 1, "failed": 0, "watched": 0},
      "reason_metrics": {"NO_ELIGIBLE_MARKET": 1},
      "market_cooldowns": {},
      "recent_events": [],
      "circuit_breaker": {"open": false, "open_until": null, "threshold": 3, "cooloff_minutes": 30}
    }
  },
  "recent_actions": []
}
""",
            encoding="utf-8",
        )
        self.committee_path.write_text(
            """{
  "lanes": {
    "fast-loop": {
      "candidate_markets": [{"market_id": "mkt-fast-1"}]
    }
  }
}
""",
            encoding="utf-8",
        )

    def _provider(self, client):
        return SimmerFundProvider(
            config=self.config,
            api_key="sk_test_123",
            state_path=self.state_path,
            committee_path=self.committee_path,
            cache_path=self.cache_path,
            client=client,
            now_fn=lambda: self.now,
        )

    def test_build_fundmanager_state_success_path(self) -> None:
        payload = self._provider(FakeSimmerClient()).build_fundmanager_state()

        self.assertFalse(payload["degraded"])
        self.assertEqual(payload["provider_health"]["status"], "OK")
        self.assertEqual(payload["last_success_ts"], isoformat(self.now))
        self.assertEqual(payload["reason_codes"], [])
        self.assertEqual(payload["account"]["position_count"], 1)
        self.assertEqual(payload["trades"]["open_order_count"], 1)
        self.assertEqual(payload["lanes"]["fast-loop"]["provider_live_status"], "DEGRADED")
        self.assertEqual(payload["lanes"]["fast-loop"]["provider_activity"]["position_count"], 1)
        self.assertTrue(self.cache_path.exists())

    def test_build_fundmanager_state_returns_cached_last_good_state_on_failure(self) -> None:
        first_payload = self._provider(FakeSimmerClient()).build_fundmanager_state()
        payload = self._provider(FakeSimmerClient(fail=True)).build_fundmanager_state()

        self.assertTrue(payload["degraded"])
        self.assertEqual(payload["provider_health"]["status"], "DEGRADED")
        self.assertEqual(payload["provider_health"]["fallback_source"], "cache")
        self.assertEqual(payload["last_success_ts"], first_payload["last_success_ts"])
        self.assertIn("PROVIDER_UNAVAILABLE", payload["reason_codes"])
        self.assertEqual(payload["account"]["position_count"], 1)

    def test_build_fundmanager_state_marks_local_state_degraded_without_cache(self) -> None:
        payload = self._provider(FakeSimmerClient(fail=True)).build_fundmanager_state()

        self.assertTrue(payload["degraded"])
        self.assertEqual(payload["provider_health"]["status"], "DEGRADED")
        self.assertEqual(payload["provider_health"]["fallback_source"], "local_state")
        self.assertIsNone(payload["last_success_ts"])
        self.assertIn("PROVIDER_UNAVAILABLE", payload["reason_codes"])
        self.assertEqual(payload["lanes"]["fast-loop"]["provider_activity"]["position_count"], 0)


if __name__ == "__main__":
    unittest.main()
