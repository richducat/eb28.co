from __future__ import annotations

import importlib
import json
import os
from dataclasses import asdict
from pathlib import Path
from typing import Protocol

from .types import ExecutionReceipt, MarketSnapshot, OrderIntent, PlatformLimits, WalletState


class ProviderError(Exception):
    def __init__(self, message: str, *, transient: bool = False, reason_code: str | None = None):
        super().__init__(message)
        self.transient = transient
        self.reason_code = reason_code


class FundManagerProvider(Protocol):
    def get_wallet_state(self) -> WalletState: ...

    def get_platform_limits(self, venue: str) -> PlatformLimits: ...

    def get_lane_candidates(self, lane_id: str, limit: int) -> list[MarketSnapshot]: ...

    def get_market_snapshot(self, market_id: str) -> MarketSnapshot: ...

    def submit_order(self, intent: OrderIntent, limit_price: float, shares: float) -> ExecutionReceipt: ...


class DryRunProvider:
    def __init__(self, scenario: dict | None = None):
        self.scenario = scenario or {}
        self.quote_calls = 0
        self.submit_calls = 0
        self.market_states = {}
        for market in self.scenario.get("markets", []):
            self.market_states[market["market_id"]] = MarketSnapshot(**market)

    @classmethod
    def from_path(cls, scenario_path: str | None):
        if not scenario_path:
            return cls()

        with Path(scenario_path).expanduser().resolve().open("r", encoding="utf-8") as handle:
            scenario = json.load(handle)
        return cls(scenario)

    def get_wallet_state(self) -> WalletState:
        wallet = self.scenario.get("wallet", {})
        return WalletState(
            usdc_available=float(wallet.get("usdc_available", 100.0)),
            gas_available_native=float(wallet.get("gas_available_native", 0.2)),
            trading_paused=bool(wallet.get("trading_paused", False)),
        )

    def get_platform_limits(self, venue: str) -> PlatformLimits:
        limits = self.scenario.get("platform_limits", {}).get(venue) or self.scenario.get("platform_limits", {}).get("default", {})
        return PlatformLimits(
            min_order_usd=float(limits.get("min_order_usd", 5.0)),
            min_shares=float(limits.get("min_shares", 5.0)),
            max_spread_bps=int(limits.get("max_spread_bps", 200)),
            max_slippage_bps=int(limits.get("max_slippage_bps", 125)),
        )

    def get_lane_candidates(self, lane_id: str, limit: int) -> list[MarketSnapshot]:
        candidates = self.scenario.get("lane_candidates", {}).get(lane_id, [])
        result = []
        for candidate in candidates[:limit]:
            market = self.market_states.get(candidate["market_id"])
            if market:
                result.append(market)
        return result

    def get_market_snapshot(self, market_id: str) -> MarketSnapshot:
        self.quote_calls += 1
        failure = self.scenario.get("quote_failures", {}).get(market_id)
        if failure:
            raise ProviderError(
                failure.get("message", f"Quote unavailable for {market_id}"),
                transient=bool(failure.get("transient", True)),
                reason_code=failure.get("reason_code"),
            )

        market = self.market_states.get(market_id)
        if not market:
            raise ProviderError(f"Unknown market {market_id}", transient=False)
        return market

    def submit_order(self, intent: OrderIntent, limit_price: float, shares: float) -> ExecutionReceipt:
        self.submit_calls += 1
        failures = self.scenario.get("submit_failures", {}).get(intent.market_id, [])
        if failures:
            current_failure = failures.pop(0)
            raise ProviderError(
                current_failure.get("message", "submit failed"),
                transient=bool(current_failure.get("transient", False)),
                reason_code=current_failure.get("reason_code"),
            )

        order_id = f"dryrun-{intent.lane_id}-{intent.market_id}-{self.submit_calls}"
        return ExecutionReceipt(
            order_id=order_id,
            status="filled",
            limit_price=limit_price,
            shares=shares,
            filled_at=self.scenario.get("filled_at"),
            metadata={"dry_run": True, "intent": asdict(intent)},
        )


def load_provider(config: dict) -> FundManagerProvider:
    module_path = os.environ.get("FUNDMANAGER_PROVIDER_MODULE")
    if module_path:
        module = importlib.import_module(module_path)
        factory = getattr(module, "build_provider", None)
        if factory is None:
            raise RuntimeError(f"{module_path} must expose build_provider(config)")
        return factory(config)

    scenario_path = os.environ.get("FUNDMANAGER_DRY_RUN_SCENARIO")
    return DryRunProvider.from_path(scenario_path)
