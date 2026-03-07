from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

LANE_MODE_ACTIVE = "active"
LANE_MODE_WATCH_ONLY = "watch-only"
LANE_MODE_DISABLED = "disabled"

LANE_STATUS_RUNNING = "RUNNING"
LANE_STATUS_DEGRADED = "DEGRADED"
LANE_STATUS_PAUSED = "PAUSED"

ORDER_OUTCOME_SUBMITTED = "submitted"
ORDER_OUTCOME_FILLED = "filled"
ORDER_OUTCOME_SKIPPED = "skipped"
ORDER_OUTCOME_FAILED = "failed"
ORDER_OUTCOME_WATCHED = "watched"

REASON_TRADING_PAUSED = "TRADING_PAUSED"
REASON_WALLET_USDC_LOW = "WALLET_USDC_LOW"
REASON_WALLET_GAS_LOW = "WALLET_GAS_LOW"
REASON_PLATFORM_LIMITS_INVALID = "PLATFORM_LIMITS_INVALID"
REASON_VENUE_NOT_ALLOWED = "VENUE_NOT_ALLOWED"
REASON_CIRCUIT_BREAKER_OPEN = "CIRCUIT_BREAKER_OPEN"
REASON_MARKET_COOLDOWN = "MARKET_COOLDOWN"
REASON_MIN_ORDER_USD = "MIN_ORDER_USD"
REASON_MIN_SHARES = "MIN_SHARES"
REASON_SPREAD_TOO_WIDE = "SPREAD_TOO_WIDE"
REASON_SLIPPAGE_TOO_WIDE = "SLIPPAGE_TOO_WIDE"
REASON_EFFECTIVE_LIMIT_TOO_HIGH = "EFFECTIVE_LIMIT_TOO_HIGH"
REASON_PRICE_UNAVAILABLE = "PRICE_UNAVAILABLE"
REASON_TRANSIENT_RETRY_EXHAUSTED = "TRANSIENT_RETRY_EXHAUSTED"
REASON_ORDER_REJECTED = "ORDER_REJECTED"
REASON_ORDER_FAILED = "ORDER_FAILED"
REASON_NO_ELIGIBLE_MARKET = "NO_ELIGIBLE_MARKET"
REASON_LANE_DISABLED = "LANE_DISABLED"
REASON_WATCH_ONLY = "WATCH_ONLY"
REASON_MAX_ACTIVE_LANES = "MAX_ACTIVE_LANES"
REASON_MARKET_DISCOVERY_FAILED = "MARKET_DISCOVERY_FAILED"
REASON_PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"

TRANSIENT_REASON_CODES = {
    REASON_PRICE_UNAVAILABLE,
    REASON_TRANSIENT_RETRY_EXHAUSTED,
    REASON_PROVIDER_UNAVAILABLE,
}

ROTATABLE_REASON_CODES = {
    REASON_MARKET_COOLDOWN,
    REASON_VENUE_NOT_ALLOWED,
    REASON_MIN_SHARES,
    REASON_PRICE_UNAVAILABLE,
    REASON_SPREAD_TOO_WIDE,
    REASON_SLIPPAGE_TOO_WIDE,
    REASON_EFFECTIVE_LIMIT_TOO_HIGH,
}

COOLDOWN_REASON_CODES = ROTATABLE_REASON_CODES | {
    REASON_TRANSIENT_RETRY_EXHAUSTED,
    REASON_ORDER_REJECTED,
    REASON_ORDER_FAILED,
}


@dataclass(slots=True)
class WalletState:
    usdc_available: float
    gas_available_native: float
    trading_paused: bool = False


@dataclass(slots=True)
class PlatformLimits:
    min_order_usd: float
    min_shares: float
    max_spread_bps: int
    max_slippage_bps: int


@dataclass(slots=True)
class MarketSnapshot:
    market_id: str
    slug: str
    venue: str
    last_price: float | None = None
    best_bid: float | None = None
    best_ask: float | None = None
    min_order_usd: float | None = None
    min_shares: float | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class OrderIntent:
    lane_id: str
    market_id: str
    venue: str
    side: str
    order_usd: float
    desired_price: float | None = None


@dataclass(slots=True)
class ExecutionReceipt:
    order_id: str
    status: str
    limit_price: float
    shares: float
    filled_at: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class GuardDecision:
    allowed: bool
    reason_code: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class LanePolicy:
    lane_id: str
    name: str
    mode: str
    priority: int
    order_usd: float
    allowed_venues: tuple[str, ...]
    target_rotation: bool
    candidate_limit: int
    market_cooldown_minutes: int
    failure_cooldown_minutes: int
    failure_circuit_threshold: int
    failure_circuit_cooloff_minutes: int
    default_side: str = "buy"
    max_bankroll_fraction: float = 0.0


@dataclass(slots=True)
class ExecutionResult:
    lane_id: str
    market_id: str | None
    outcome: str
    reason_code: str | None = None
    status: str = LANE_STATUS_DEGRADED
    attempts: int = 0
    order_id: str | None = None
    limit_price: float | None = None
    shares: float | None = None
    filled_at: str | None = None
    transient: bool = False
    details: dict[str, Any] = field(default_factory=dict)
