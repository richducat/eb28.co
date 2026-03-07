from __future__ import annotations

import math
import time
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Callable

from .providers import ProviderError
from .types import (
    GuardDecision,
    ExecutionResult,
    LanePolicy,
    MarketSnapshot,
    OrderIntent,
    PlatformLimits,
    WalletState,
    LANE_MODE_ACTIVE,
    LANE_MODE_DISABLED,
    LANE_MODE_WATCH_ONLY,
    LANE_STATUS_DEGRADED,
    LANE_STATUS_PAUSED,
    LANE_STATUS_RUNNING,
    ORDER_OUTCOME_FAILED,
    ORDER_OUTCOME_FILLED,
    ORDER_OUTCOME_SKIPPED,
    ORDER_OUTCOME_WATCHED,
    REASON_CIRCUIT_BREAKER_OPEN,
    REASON_EFFECTIVE_LIMIT_TOO_HIGH,
    REASON_LANE_DISABLED,
    REASON_MARKET_COOLDOWN,
    REASON_MIN_ORDER_USD,
    REASON_MIN_SHARES,
    REASON_NO_ELIGIBLE_MARKET,
    REASON_ORDER_FAILED,
    REASON_ORDER_REJECTED,
    REASON_PLATFORM_LIMITS_INVALID,
    REASON_PRICE_UNAVAILABLE,
    REASON_SLIPPAGE_TOO_WIDE,
    REASON_SPREAD_TOO_WIDE,
    REASON_TRADING_PAUSED,
    REASON_TRANSIENT_RETRY_EXHAUSTED,
    REASON_VENUE_NOT_ALLOWED,
    REASON_WALLET_GAS_LOW,
    REASON_WALLET_USDC_LOW,
    REASON_WATCH_ONLY,
    ROTATABLE_REASON_CODES,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def isoformat(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def is_limits_sane(limits: PlatformLimits) -> bool:
    return (
        limits.min_order_usd > 0
        and limits.min_shares > 0
        and limits.max_spread_bps > 0
        and limits.max_slippage_bps > 0
        and limits.max_slippage_bps <= 5000
    )


def calculate_spread_bps(market: MarketSnapshot) -> float:
    if not market.best_bid or not market.best_ask or market.best_bid <= 0 or market.best_ask <= 0:
        return math.inf
    midpoint = (market.best_bid + market.best_ask) / 2
    if midpoint <= 0:
        return math.inf
    return ((market.best_ask - market.best_bid) / midpoint) * 10_000


def calculate_effective_limit_price(market: MarketSnapshot, intent: OrderIntent, max_slippage_bps: int) -> float:
    if market.best_ask is None and market.last_price is None:
        raise ValueError("market has no price")

    base_price = market.best_ask if market.best_ask is not None else market.last_price
    slippage_multiplier = 1 + (max_slippage_bps / 10_000)
    target_price = intent.desired_price if intent.desired_price is not None else base_price
    effective_limit = min(target_price, base_price * slippage_multiplier)
    return round(float(effective_limit), 6)


class ReliabilityLayer:
    def __init__(
        self,
        *,
        now_fn: Callable[[], datetime] = utcnow,
        sleep_fn: Callable[[float], None] = time.sleep,
        price_cache_ttl_seconds: int = 20,
        stale_quote_fallback_seconds: int = 60,
    ):
        self.now_fn = now_fn
        self.sleep_fn = sleep_fn
        self.price_cache_ttl_seconds = price_cache_ttl_seconds
        self.stale_quote_fallback_seconds = stale_quote_fallback_seconds
        self.quote_cache: dict[str, tuple[datetime, MarketSnapshot]] = {}

    def preflight(
        self,
        *,
        wallet: WalletState,
        limits: PlatformLimits,
        lane_policy: LanePolicy,
        lane_state: dict,
        wallet_config: dict,
    ) -> GuardDecision:
        if lane_policy.mode == LANE_MODE_DISABLED:
            return GuardDecision(False, REASON_LANE_DISABLED)

        if wallet.trading_paused:
            return GuardDecision(False, REASON_TRADING_PAUSED)

        if wallet.usdc_available < float(wallet_config.get("min_usdc_buffer", 0.0)):
            return GuardDecision(
                False,
                REASON_WALLET_USDC_LOW,
                {"available_usdc": wallet.usdc_available},
            )

        if wallet.gas_available_native < float(wallet_config.get("min_gas_native", 0.0)):
            return GuardDecision(
                False,
                REASON_WALLET_GAS_LOW,
                {"available_gas": wallet.gas_available_native},
            )

        if not is_limits_sane(limits):
            return GuardDecision(False, REASON_PLATFORM_LIMITS_INVALID, asdict(limits))

        circuit = lane_state.get("circuit_breaker", {})
        circuit_until = parse_iso(circuit.get("open_until"))
        if circuit.get("open") and circuit_until and circuit_until > self.now_fn():
            return GuardDecision(
                False,
                REASON_CIRCUIT_BREAKER_OPEN,
                {"open_until": circuit.get("open_until")},
            )

        if lane_policy.mode == LANE_MODE_WATCH_ONLY:
            return GuardDecision(True, REASON_WATCH_ONLY)

        return GuardDecision(True)

    def _is_market_on_cooldown(self, lane_state: dict, market_id: str) -> str | None:
        cooldowns = lane_state.get("market_cooldowns", {})
        until = parse_iso(cooldowns.get(market_id, {}).get("until"))
        if until and until > self.now_fn():
            return isoformat(until)
        return None

    def market_guard(
        self,
        *,
        lane_policy: LanePolicy,
        lane_state: dict,
        market: MarketSnapshot,
        limits: PlatformLimits,
        intent: OrderIntent,
    ) -> GuardDecision:
        if market.venue not in lane_policy.allowed_venues:
            return GuardDecision(False, REASON_VENUE_NOT_ALLOWED, {"venue": market.venue})

        cooldown_until = self._is_market_on_cooldown(lane_state, market.market_id)
        if cooldown_until:
            return GuardDecision(False, REASON_MARKET_COOLDOWN, {"until": cooldown_until})

        spread_bps = calculate_spread_bps(market)
        if lane_policy.mode == LANE_MODE_WATCH_ONLY:
            details = {
                "best_bid": market.best_bid,
                "best_ask": market.best_ask,
                "last_price": market.last_price,
            }
            if math.isfinite(spread_bps):
                details["spread_bps"] = round(spread_bps, 2)
            return GuardDecision(True, details=details)

        min_order_usd = max(limits.min_order_usd, market.min_order_usd or 0.0)
        if intent.order_usd < min_order_usd:
            return GuardDecision(
                False,
                REASON_MIN_ORDER_USD,
                {"order_usd": intent.order_usd, "min_order_usd": min_order_usd},
            )

        if spread_bps > limits.max_spread_bps:
            return GuardDecision(False, REASON_SPREAD_TOO_WIDE, {"spread_bps": spread_bps})

        try:
            effective_limit = calculate_effective_limit_price(market, intent, limits.max_slippage_bps)
        except ValueError:
            return GuardDecision(False, REASON_PRICE_UNAVAILABLE)

        if effective_limit >= 0.99:
            return GuardDecision(
                False,
                REASON_EFFECTIVE_LIMIT_TOO_HIGH,
                {"effective_limit_price": effective_limit},
            )

        best_ask = market.best_ask if market.best_ask is not None else market.last_price
        if best_ask is None or best_ask <= 0:
            return GuardDecision(False, REASON_PRICE_UNAVAILABLE)

        slippage_bps = ((effective_limit - best_ask) / best_ask) * 10_000
        if slippage_bps > limits.max_slippage_bps:
            return GuardDecision(
                False,
                REASON_SLIPPAGE_TOO_WIDE,
                {"slippage_bps": slippage_bps},
            )

        min_shares = max(limits.min_shares, market.min_shares or 0.0)
        shares = intent.order_usd / effective_limit
        if shares < min_shares:
            return GuardDecision(
                False,
                REASON_MIN_SHARES,
                {
                    "shares": round(shares, 6),
                    "min_shares": min_shares,
                    "effective_limit_price": effective_limit,
                },
            )

        return GuardDecision(
            True,
            details={
                "effective_limit_price": effective_limit,
                "shares": round(shares, 6),
                "spread_bps": round(spread_bps, 2),
                "slippage_bps": round(slippage_bps, 2),
            },
        )

    def load_market_snapshot(self, provider, market_id: str) -> MarketSnapshot:
        now = self.now_fn()
        cached = self.quote_cache.get(market_id)
        if cached:
            cached_at, cached_market = cached
            if (now - cached_at).total_seconds() <= self.price_cache_ttl_seconds:
                return cached_market

        try:
            market = provider.get_market_snapshot(market_id)
        except ProviderError as error:
            if cached:
                cached_at, cached_market = cached
                if (now - cached_at).total_seconds() <= self.stale_quote_fallback_seconds:
                    return cached_market
            raise error

        self.quote_cache[market_id] = (now, market)
        return market

    def _backoff_seconds(self, attempt: int, retry_policy: dict) -> float:
        base = float(retry_policy.get("retry_backoff_seconds", 2))
        cap = float(retry_policy.get("retry_backoff_cap_seconds", 15))
        return min(cap, base * (2 ** max(0, attempt - 1)))

    def execute_lane(
        self,
        *,
        provider,
        wallet: WalletState,
        limits: PlatformLimits,
        lane_policy: LanePolicy,
        lane_state: dict,
        wallet_config: dict,
        retry_policy: dict,
        candidates: list[MarketSnapshot],
    ) -> ExecutionResult:
        preflight = self.preflight(
            wallet=wallet,
            limits=limits,
            lane_policy=lane_policy,
            lane_state=lane_state,
            wallet_config=wallet_config,
        )

        if not preflight.allowed:
            return ExecutionResult(
                lane_id=lane_policy.lane_id,
                market_id=None,
                outcome=ORDER_OUTCOME_SKIPPED,
                reason_code=preflight.reason_code,
                status=LANE_STATUS_PAUSED if preflight.reason_code in {REASON_CIRCUIT_BREAKER_OPEN, REASON_LANE_DISABLED} else LANE_STATUS_DEGRADED,
                details=preflight.details,
            )

        last_rotated_result: ExecutionResult | None = None

        for candidate in candidates[: lane_policy.candidate_limit]:
            try:
                market = self.load_market_snapshot(provider, candidate.market_id)
            except ProviderError as error:
                reason_code = error.reason_code or REASON_PRICE_UNAVAILABLE
                if lane_policy.target_rotation and reason_code in ROTATABLE_REASON_CODES:
                    last_rotated_result = ExecutionResult(
                        lane_id=lane_policy.lane_id,
                        market_id=candidate.market_id,
                        outcome=ORDER_OUTCOME_SKIPPED,
                        reason_code=reason_code,
                        status=LANE_STATUS_DEGRADED,
                        transient=error.transient,
                        details={"message": str(error), "rotation_exhausted": False},
                    )
                    continue
                return ExecutionResult(
                    lane_id=lane_policy.lane_id,
                    market_id=candidate.market_id,
                    outcome=ORDER_OUTCOME_SKIPPED,
                    reason_code=reason_code,
                    status=LANE_STATUS_DEGRADED,
                    transient=error.transient,
                    details={"message": str(error)},
                )

            intent = OrderIntent(
                lane_id=lane_policy.lane_id,
                market_id=market.market_id,
                venue=market.venue,
                side=lane_policy.default_side,
                order_usd=lane_policy.order_usd,
            )
            guard = self.market_guard(
                lane_policy=lane_policy,
                lane_state=lane_state,
                market=market,
                limits=limits,
                intent=intent,
            )
            if not guard.allowed:
                if lane_policy.target_rotation and guard.reason_code in ROTATABLE_REASON_CODES:
                    last_rotated_result = ExecutionResult(
                        lane_id=lane_policy.lane_id,
                        market_id=market.market_id,
                        outcome=ORDER_OUTCOME_SKIPPED,
                        reason_code=guard.reason_code,
                        status=LANE_STATUS_DEGRADED,
                        details={**guard.details, "rotation_exhausted": False},
                    )
                    continue
                return ExecutionResult(
                    lane_id=lane_policy.lane_id,
                    market_id=market.market_id,
                    outcome=ORDER_OUTCOME_SKIPPED,
                    reason_code=guard.reason_code,
                    status=LANE_STATUS_DEGRADED,
                    details=guard.details,
                )

            if lane_policy.mode == LANE_MODE_WATCH_ONLY:
                return ExecutionResult(
                    lane_id=lane_policy.lane_id,
                    market_id=market.market_id,
                    outcome=ORDER_OUTCOME_WATCHED,
                    reason_code=REASON_WATCH_ONLY,
                    status=LANE_STATUS_RUNNING,
                    details=guard.details,
                )

            attempts = 0
            max_attempts = max(1, int(retry_policy.get("transient_retry_attempts", 1)))
            while attempts < max_attempts:
                attempts += 1
                try:
                    receipt = provider.submit_order(
                        intent,
                        limit_price=guard.details["effective_limit_price"],
                        shares=guard.details["shares"],
                    )
                    outcome = ORDER_OUTCOME_FILLED if receipt.filled_at or receipt.status.lower() == "filled" else "submitted"
                    return ExecutionResult(
                        lane_id=lane_policy.lane_id,
                        market_id=market.market_id,
                        outcome=outcome,
                        reason_code=None,
                        status=LANE_STATUS_RUNNING,
                        attempts=attempts,
                        order_id=receipt.order_id,
                        limit_price=receipt.limit_price,
                        shares=receipt.shares,
                        filled_at=receipt.filled_at,
                        details={"receipt_status": receipt.status, **guard.details},
                    )
                except ProviderError as error:
                    if error.transient and attempts < max_attempts:
                        self.sleep_fn(self._backoff_seconds(attempts, retry_policy))
                        continue
                    return ExecutionResult(
                        lane_id=lane_policy.lane_id,
                        market_id=market.market_id,
                        outcome=ORDER_OUTCOME_FAILED,
                        reason_code=(
                            REASON_TRANSIENT_RETRY_EXHAUSTED
                            if error.transient
                            else (error.reason_code or REASON_ORDER_REJECTED)
                        ),
                        status=LANE_STATUS_DEGRADED,
                        attempts=attempts,
                        transient=error.transient,
                        details={"message": str(error), **guard.details},
                    )

        if last_rotated_result is not None:
            return ExecutionResult(
                lane_id=last_rotated_result.lane_id,
                market_id=last_rotated_result.market_id,
                outcome=last_rotated_result.outcome,
                reason_code=last_rotated_result.reason_code,
                status=last_rotated_result.status,
                transient=last_rotated_result.transient,
                details={**last_rotated_result.details, "rotation_exhausted": True},
            )

        return ExecutionResult(
            lane_id=lane_policy.lane_id,
            market_id=None,
            outcome=ORDER_OUTCOME_SKIPPED,
            reason_code=REASON_NO_ELIGIBLE_MARKET,
            status=LANE_STATUS_DEGRADED,
        )

    @staticmethod
    def cooldown_expiry(minutes: int, *, now: datetime | None = None) -> str:
        reference = now or utcnow()
        return isoformat(reference + timedelta(minutes=minutes))
