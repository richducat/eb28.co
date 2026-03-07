from __future__ import annotations

import importlib
import importlib.metadata
import os
from pathlib import Path
from typing import Any

from ops.fundmanager.config import load_config
from ops.fundmanager.providers import ProviderError
from ops.fundmanager.reliability import isoformat, utcnow
from ops.fundmanager.state import load_state, save_state, summarize_state, validate_state_payload
from ops.fundmanager.types import (
    ExecutionReceipt,
    MarketSnapshot,
    OrderIntent,
    PlatformLimits,
    REASON_LANE_DISABLED,
    REASON_NO_ELIGIBLE_MARKET,
    REASON_ORDER_FAILED,
    REASON_ORDER_REJECTED,
    REASON_PROVIDER_UNAVAILABLE,
    REASON_WATCH_ONLY,
    WalletState,
)

DEFAULT_ORCHESTRATOR_STATE_PATH = "ops/state/fundmanager-state.json"
DEFAULT_COMMITTEE_STATE_PATH = "ops/state/committee-state.json"
DEFAULT_PROVIDER_CACHE_PATH = "ops/state/fundmanager-provider-cache.json"
DEFAULT_MARKET_LIMIT = 50
SOURCE_PREFIX = "sdk:"
IGNORED_PROVIDER_REASON_CODES = {
    REASON_LANE_DISABLED,
    REASON_NO_ELIGIBLE_MARKET,
    REASON_WATCH_ONLY,
}


def _load_optional_json(path: str | Path) -> dict:
    file_path = Path(path)
    if not file_path.exists():
        return {}
    return load_state(file_path)


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() not in {"", "0", "false", "no", "off"}
    return value is not None


def _get_value(source: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if isinstance(source, dict) and name in source:
            value = source.get(name)
        else:
            value = getattr(source, name, None)
        if value is not None:
            return value
    return default


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int_or_zero(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _slugify(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "-" for char in value)
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "market"


def _market_ids_from_value(value: Any) -> list[str]:
    market_ids: list[str] = []

    if isinstance(value, str):
        if value:
            market_ids.append(value)
        return market_ids

    if isinstance(value, list):
        for item in value:
            market_ids.extend(_market_ids_from_value(item))
        return market_ids

    if not isinstance(value, dict):
        return market_ids

    for key in ("market_id", "marketId"):
        market_id = value.get(key)
        if isinstance(market_id, str) and market_id:
            market_ids.append(market_id)

    if "id" in value and any(key in value for key in ("question", "title", "slug", "market", "market_data")):
        market_id = value.get("id")
        if isinstance(market_id, str) and market_id:
            market_ids.append(market_id)

    for key in (
        "market",
        "markets",
        "market_ids",
        "marketIds",
        "candidate_markets",
        "candidateMarkets",
        "candidates",
        "recommendations",
        "targets",
    ):
        market_ids.extend(_market_ids_from_value(value.get(key)))

    return market_ids


class SimmerFundProvider:
    def __init__(
        self,
        config: dict | None = None,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        venue: str | None = None,
        state_path: str | Path | None = None,
        committee_path: str | Path | None = None,
        cache_path: str | Path | None = None,
        client: Any | None = None,
        client_factory=None,
        now_fn=utcnow,
    ):
        self.config = config or load_config()
        self.api_key = api_key or os.environ.get("SIMMER_API_KEY")
        self.base_url = base_url or os.environ.get("SIMMER_BASE_URL", "https://api.simmer.markets")
        self.venue = venue or os.environ.get("TRADING_VENUE", "polymarket")
        self.state_path = Path(state_path or os.environ.get("FUNDMANAGER_STATE_PATH", DEFAULT_ORCHESTRATOR_STATE_PATH))
        self.committee_path = Path(
            committee_path or os.environ.get("FUNDMANAGER_COMMITTEE_STATE_PATH", DEFAULT_COMMITTEE_STATE_PATH)
        )
        self.cache_path = Path(
            cache_path or os.environ.get("FUNDMANAGER_PROVIDER_CACHE_PATH", DEFAULT_PROVIDER_CACHE_PATH)
        )
        self.market_limit = max(1, _int_or_zero(os.environ.get("FUNDMANAGER_PROVIDER_MARKET_LIMIT")) or DEFAULT_MARKET_LIMIT)
        self.now_fn = now_fn
        self._client = client
        self._client_factory = client_factory
        self._sdk_version: str | None = None
        self._markets_index: dict[str, Any] | None = None
        self._positions_cache: list[dict[str, Any]] = []
        self._orders_cache: list[dict[str, Any]] = []

    def _get_client(self):
        if self._client is not None:
            return self._client

        if self._client_factory is not None:
            self._client = self._client_factory()
            return self._client

        if not self.api_key:
            raise RuntimeError("SIMMER_API_KEY is required for SimmerFundProvider")

        try:
            module = importlib.import_module("simmer_sdk")
            self._sdk_version = importlib.metadata.version("simmer-sdk")
        except ModuleNotFoundError as error:
            raise RuntimeError("simmer_sdk is not installed; run `pip install simmer-sdk`") from error
        except importlib.metadata.PackageNotFoundError:
            module = importlib.import_module("simmer_sdk")
            self._sdk_version = None

        client_cls = getattr(module, "SimmerClient")
        self._client = client_cls(api_key=self.api_key, base_url=self.base_url, venue=self.venue)
        return self._client

    def _preflight(self) -> dict[str, Any]:
        kalshi_key_path = os.environ.get("KALSHI_PRIVATE_KEY_PATH")
        return {
            "simmer_api_key": {"present": bool(self.api_key)},
            "kalshi_api_key_id": {"present": bool(os.environ.get("KALSHI_API_KEY_ID"))},
            "kalshi_private_key_path": {
                "present": bool(kalshi_key_path),
                "path": kalshi_key_path,
                "exists": bool(kalshi_key_path and Path(kalshi_key_path).expanduser().exists()),
            },
            "solana_private_key": {"present": bool(os.environ.get("SOLANA_PRIVATE_KEY"))},
        }

    def _load_local_state(self) -> tuple[dict, dict]:
        state = load_state(self.state_path)
        summarize_state(state, self.config)
        committee = _load_optional_json(self.committee_path)
        return state, committee

    def _list_live_markets(self) -> list[Any]:
        if self._markets_index is not None:
            return list(self._markets_index.values())

        client = self._get_client()
        markets: dict[str, Any] = {}

        for market in client.get_markets(status="active", limit=self.market_limit):
            market_id = _get_value(market, "id")
            if market_id:
                markets[str(market_id)] = market

        get_fast_markets = getattr(client, "get_fast_markets", None)
        if callable(get_fast_markets):
            for market in get_fast_markets(limit=self.market_limit):
                market_id = _get_value(market, "id")
                if market_id:
                    markets[str(market_id)] = market

        self._markets_index = markets
        return list(markets.values())

    def _to_market_snapshot(self, market_id: str, market: Any, context: dict | None = None) -> MarketSnapshot:
        context_market = context.get("market") if isinstance(context, dict) else None
        question = _get_value(context_market, "question", default=None) or _get_value(market, "question", default="") or market_id
        price_yes = (
            _float_or_none(_get_value(context_market, "price_yes", "yes_price"))
            or _float_or_none(_get_value(context_market, "external_price_yes", "current_probability"))
            or _float_or_none(_get_value(market, "external_price_yes", "current_probability"))
            or 0.5
        )

        best_bid = _float_or_none(_get_value(context_market, "best_bid_yes", "best_bid"))
        best_ask = _float_or_none(_get_value(context_market, "best_ask_yes", "best_ask"))
        spread_cents = _float_or_none(_get_value(context_market, "spread_cents")) or _float_or_none(
            _get_value(market, "spread_cents")
        )
        if spread_cents is not None and (best_bid is None or best_ask is None):
            half_spread = spread_cents / 200.0
            best_bid = best_bid if best_bid is not None else max(0.001, round(price_yes - half_spread, 6))
            best_ask = best_ask if best_ask is not None else min(0.999, round(price_yes + half_spread, 6))

        if best_bid is None:
            best_bid = round(max(0.001, price_yes - 0.005), 6)
        if best_ask is None:
            best_ask = round(min(0.999, price_yes + 0.005), 6)

        return MarketSnapshot(
            market_id=market_id,
            slug=_get_value(context_market, "slug", default=None) or _slugify(question),
            venue=_get_value(context_market, "import_source", default=None)
            or _get_value(market, "import_source", default=None)
            or self.venue,
            last_price=round(price_yes, 6),
            best_bid=best_bid,
            best_ask=best_ask,
            min_order_usd=_float_or_none(self.config.get("platform_limits", {}).get("min_order_usd")),
            min_shares=_float_or_none(self.config.get("platform_limits", {}).get("min_shares")),
            metadata={
                "question": question,
                "status": _get_value(context_market, "status", default=None) or _get_value(market, "status", default="active"),
                "resolves_at": _get_value(context_market, "resolves_at", default=None)
                or _get_value(market, "resolves_at", default=None),
                "liquidity_tier": _get_value(context_market, "liquidity_tier", default=None)
                or _get_value(market, "liquidity_tier", default=None),
                "is_live_now": _truthy(_get_value(context_market, "is_live_now", default=None))
                if _get_value(context_market, "is_live_now", default=None) is not None
                else _get_value(market, "is_live_now", default=None),
            },
        )

    def _extract_lane_market_ids(self, lane_id: str, committee_state: dict, orchestrator_state: dict) -> list[str]:
        market_ids: list[str] = []

        for lane_container in (
            committee_state.get("lanes", {}).get(lane_id),
            committee_state.get(lane_id),
            orchestrator_state.get("lanes", {}).get(lane_id),
        ):
            market_ids.extend(_market_ids_from_value(lane_container))

        for recent in orchestrator_state.get("recent_actions", []):
            if recent.get("lane_id") != lane_id:
                continue
            market_ids.extend(_market_ids_from_value(recent))

        deduped: list[str] = []
        seen: set[str] = set()
        for market_id in market_ids:
            if market_id in seen:
                continue
            deduped.append(market_id)
            seen.add(market_id)
        return deduped

    def _position_to_dict(self, position: Any) -> dict[str, Any]:
        sources = _get_value(position, "sources", default=None) or []
        return {
            "market_id": _get_value(position, "market_id", default=""),
            "question": _get_value(position, "question", default=""),
            "shares_yes": _float_or_none(_get_value(position, "shares_yes", default=0.0)) or 0.0,
            "shares_no": _float_or_none(_get_value(position, "shares_no", default=0.0)) or 0.0,
            "current_value": _float_or_none(_get_value(position, "current_value", default=0.0)) or 0.0,
            "pnl": _float_or_none(_get_value(position, "pnl", default=0.0)) or 0.0,
            "status": _get_value(position, "status", default="active"),
            "venue": _get_value(position, "venue", default=self.venue),
            "sim_balance": _float_or_none(_get_value(position, "sim_balance", default=None)),
            "cost_basis": _float_or_none(_get_value(position, "cost_basis", default=None)),
            "avg_cost": _float_or_none(_get_value(position, "avg_cost", default=None)),
            "current_price": _float_or_none(_get_value(position, "current_price", default=None)),
            "sources": list(sources),
        }

    def _serialize_market(self, market: Any) -> dict[str, Any]:
        market_id = str(_get_value(market, "id", default=""))
        return {
            "market_id": market_id,
            "question": _get_value(market, "question", default=""),
            "status": _get_value(market, "status", default="active"),
            "import_source": _get_value(market, "import_source", default=None),
            "current_probability": _float_or_none(_get_value(market, "current_probability", default=None)),
            "external_price_yes": _float_or_none(_get_value(market, "external_price_yes", default=None)),
            "divergence": _float_or_none(_get_value(market, "divergence", default=None)),
            "resolves_at": _get_value(market, "resolves_at", default=None),
            "is_live_now": _get_value(market, "is_live_now", default=None),
            "spread_cents": _float_or_none(_get_value(market, "spread_cents", default=None)),
            "liquidity_tier": _get_value(market, "liquidity_tier", default=None),
        }

    def _lane_source_tags(self, lane_id: str) -> set[str]:
        return {
            f"{SOURCE_PREFIX}{lane_id}",
            f"{SOURCE_PREFIX}{lane_id.replace('-', '_')}",
        }

    def _augment_lanes(self, payload: dict, committee_state: dict) -> None:
        lanes = payload.get("lanes", {})
        for lane_id, lane in lanes.items():
            reason_codes = sorted(
                {
                    code
                    for code in [lane.get("last_reason_code"), *list((lane.get("reason_metrics") or {}).keys())]
                    if code
                }
            )
            source_tags = self._lane_source_tags(lane_id)
            lane_positions = [
                position
                for position in self._positions_cache
                if source_tags.intersection(set(position.get("sources") or []))
            ]
            tracked_market_ids = set(self._extract_lane_market_ids(lane_id, committee_state, payload))
            lane_orders = [
                order
                for order in self._orders_cache
                if source_tags.intersection(set(order.get("sources") or []))
                or order.get("market_id") in tracked_market_ids
            ]
            lane["provider_reason_codes"] = reason_codes
            lane["provider_live_status"] = lane.get("status")
            lane["provider_activity"] = {
                "tracked_market_ids": sorted(tracked_market_ids),
                "positions": lane_positions,
                "open_orders": lane_orders,
                "position_count": len(lane_positions),
                "open_order_count": len(lane_orders),
                "position_value_usd": round(sum(position.get("current_value") or 0.0 for position in lane_positions), 6),
                "position_pnl_usd": round(sum(position.get("pnl") or 0.0 for position in lane_positions), 6),
            }

    def _reason_codes(self, payload: dict, provider_reason_codes: list[str] | None = None) -> list[str]:
        reason_codes = set(provider_reason_codes or [])
        for blocker in payload.get("summary", {}).get("top_blockers", []):
            reason_code = blocker.get("reason_code")
            if reason_code:
                reason_codes.add(reason_code)
        for lane in payload.get("lanes", {}).values():
            if lane.get("last_reason_code"):
                reason_codes.add(lane["last_reason_code"])
            reason_codes.update(code for code in (lane.get("provider_reason_codes") or []) if code)
        return sorted(code for code in reason_codes if code and code not in IGNORED_PROVIDER_REASON_CODES)

    def _success_health(
        self,
        *,
        now_iso: str,
        portfolio: dict,
        markets: list[dict[str, Any]],
        committee_state: dict,
    ) -> dict[str, Any]:
        return {
            "status": "OK",
            "degraded": False,
            "last_checked_at": now_iso,
            "last_success_ts": now_iso,
            "sdk_version": self._sdk_version,
            "venue": self.venue,
            "base_url": self.base_url,
            "paths": {
                "state_path": str(self.state_path),
                "committee_path": str(self.committee_path),
                "cache_path": str(self.cache_path),
            },
            "preflight": self._preflight(),
            "account": {
                "balance_usdc": _float_or_none(portfolio.get("balance_usdc")) or 0.0,
                "total_exposure": _float_or_none(portfolio.get("total_exposure")) or 0.0,
                "position_count": len(self._positions_cache),
                "open_order_count": len(self._orders_cache),
            },
            "markets": {
                "active_count": len(markets),
                "fast_market_count": sum(1 for market in markets if _truthy(market.get("is_live_now"))),
            },
            "committee": {
                "present": bool(committee_state),
                "lane_count": len(committee_state.get("lanes", {})) if isinstance(committee_state, dict) else 0,
            },
        }

    def _degraded_health(
        self,
        *,
        now_iso: str,
        last_success_ts: str | None,
        fallback_source: str,
        error: Exception,
    ) -> dict[str, Any]:
        return {
            "status": "DEGRADED",
            "degraded": True,
            "last_checked_at": now_iso,
            "last_success_ts": last_success_ts,
            "fallback_source": fallback_source,
            "error": {"type": error.__class__.__name__, "message": str(error)},
            "sdk_version": self._sdk_version,
            "venue": self.venue,
            "base_url": self.base_url,
            "paths": {
                "state_path": str(self.state_path),
                "committee_path": str(self.committee_path),
                "cache_path": str(self.cache_path),
            },
            "preflight": self._preflight(),
        }

    def _build_live_payload(self, orchestrator_state: dict, committee_state: dict) -> dict:
        now_iso = isoformat(self.now_fn())
        client = self._get_client()
        portfolio = client.get_portfolio() or {}
        self._positions_cache = [self._position_to_dict(position) for position in client.get_positions()]
        open_orders = client.get_open_orders() or {}
        self._orders_cache = list(open_orders.get("orders") or [])
        markets = [self._serialize_market(market) for market in self._list_live_markets()]

        payload = dict(orchestrator_state)
        payload["generated_at"] = payload.get("generated_at") or now_iso
        payload["account"] = {
            "balance_usdc": _float_or_none(portfolio.get("balance_usdc")) or 0.0,
            "total_exposure": _float_or_none(portfolio.get("total_exposure")) or 0.0,
            "position_count": len(self._positions_cache),
            "open_order_count": len(self._orders_cache),
        }
        payload["markets"] = markets
        payload["trades"] = {
            "positions": self._positions_cache,
            "open_orders": self._orders_cache,
            "open_order_count": _int_or_zero(open_orders.get("count")) or len(self._orders_cache),
        }
        payload["committee"] = committee_state
        payload["degraded"] = False
        payload["last_success_ts"] = now_iso
        self._augment_lanes(payload, committee_state)
        payload["provider_health"] = self._success_health(
            now_iso=now_iso,
            portfolio=portfolio,
            markets=markets,
            committee_state=committee_state,
        )
        payload["reason_codes"] = self._reason_codes(payload)
        validate_state_payload(payload, require_provider_fields=True)
        save_state(self.cache_path, payload)
        return payload

    def _fallback_payload(self, orchestrator_state: dict, committee_state: dict, error: Exception) -> dict:
        now_iso = isoformat(self.now_fn())
        cached_payload = _load_optional_json(self.cache_path)
        fallback_source = "cache" if cached_payload else "local_state"
        payload = dict(cached_payload or orchestrator_state)
        payload.setdefault("lanes", orchestrator_state.get("lanes", {}))
        payload.setdefault("recent_actions", orchestrator_state.get("recent_actions", []))
        payload["degraded"] = True
        payload["committee"] = committee_state
        payload["provider_health"] = self._degraded_health(
            now_iso=now_iso,
            last_success_ts=payload.get("last_success_ts"),
            fallback_source=fallback_source,
            error=error,
        )
        provider_reason_codes = [REASON_PROVIDER_UNAVAILABLE]
        payload["reason_codes"] = self._reason_codes(payload, provider_reason_codes=provider_reason_codes)
        if not cached_payload:
            self._augment_lanes(payload, committee_state)
            payload["last_success_ts"] = None
        validate_state_payload(payload, require_provider_fields=True)
        return payload

    def build_fundmanager_state(self) -> dict:
        orchestrator_state, committee_state = self._load_local_state()
        try:
            return self._build_live_payload(orchestrator_state, committee_state)
        except Exception as error:
            return self._fallback_payload(orchestrator_state, committee_state, error)

    def get_fundmanager_state(self) -> dict:
        return self.build_fundmanager_state()

    def get_wallet_state(self) -> WalletState:
        portfolio = self._get_client().get_portfolio() or {}
        return WalletState(
            usdc_available=_float_or_none(portfolio.get("balance_usdc")) or 0.0,
            gas_available_native=1.0,
            trading_paused=False,
        )

    def get_platform_limits(self, venue: str) -> PlatformLimits:
        limits = self.config.get("platform_limits", {})
        return PlatformLimits(
            min_order_usd=_float_or_none(limits.get("min_order_usd")) or 5.0,
            min_shares=_float_or_none(limits.get("min_shares")) or 5.0,
            max_spread_bps=_int_or_zero(limits.get("max_spread_bps")) or 200,
            max_slippage_bps=_int_or_zero(limits.get("max_slippage_bps")) or 125,
        )

    def get_lane_candidates(self, lane_id: str, limit: int) -> list[MarketSnapshot]:
        orchestrator_state, committee_state = self._load_local_state()
        candidates: list[MarketSnapshot] = []
        for market_id in self._extract_lane_market_ids(lane_id, committee_state, orchestrator_state)[:limit]:
            try:
                candidates.append(self.get_market_snapshot(market_id))
            except ProviderError:
                continue
        return candidates

    def get_market_snapshot(self, market_id: str) -> MarketSnapshot:
        market = next((item for item in self._list_live_markets() if str(_get_value(item, "id", default="")) == market_id), None)
        if market is None:
            raise ProviderError(f"Simmer market {market_id} is unavailable", transient=True, reason_code=REASON_PROVIDER_UNAVAILABLE)

        context = None
        get_market_context = getattr(self._get_client(), "get_market_context", None)
        if callable(get_market_context):
            try:
                context = get_market_context(market_id) or {}
            except Exception:
                context = {}

        return self._to_market_snapshot(market_id, market, context)

    def submit_order(self, intent: OrderIntent, limit_price: float, shares: float) -> ExecutionReceipt:
        try:
            result = self._get_client().trade(
                market_id=intent.market_id,
                side=intent.side,
                amount=float(intent.order_usd),
                venue=intent.venue or self.venue,
                price=float(limit_price),
                source=f"{SOURCE_PREFIX}{intent.lane_id}",
            )
        except Exception as error:
            raise ProviderError(str(error), transient=True, reason_code=REASON_ORDER_FAILED) from error

        if not getattr(result, "success", False):
            message = _get_value(result, "error", "skip_reason", default="Simmer trade failed")
            raise ProviderError(str(message), transient=False, reason_code=REASON_ORDER_REJECTED)

        order_status = str(_get_value(result, "order_status", default="submitted") or "submitted")
        shares_bought = _float_or_none(_get_value(result, "shares_bought", default=None)) or float(shares)
        filled = getattr(result, "fully_filled", False) or order_status.lower() in {"matched", "filled"}
        return ExecutionReceipt(
            order_id=_get_value(result, "trade_id", default=None) or f"simmer-{intent.market_id}",
            status="filled" if filled else order_status,
            limit_price=float(limit_price),
            shares=shares_bought,
            filled_at=isoformat(self.now_fn()) if filled else None,
            metadata={
                "venue": _get_value(result, "venue", default=intent.venue or self.venue),
                "cost": _float_or_none(_get_value(result, "cost", default=None)),
                "shares_requested": _float_or_none(_get_value(result, "shares_requested", default=None)),
            },
        )


def build_provider(config: dict) -> SimmerFundProvider:
    return SimmerFundProvider(config=config)
