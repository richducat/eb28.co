from __future__ import annotations

from datetime import timedelta
from typing import Any

from .config import get_lane_policies
from .providers import ProviderError, load_provider
from .reliability import ReliabilityLayer, isoformat, utcnow
from .state import (
    append_lane_event,
    append_recent_action,
    ensure_lane_state,
    load_state,
    note_result,
    prune_market_cooldowns,
    resume_circuit_breaker_if_elapsed,
    save_state,
    set_market_cooldown,
    summarize_state,
)
from .types import (
    COOLDOWN_REASON_CODES,
    LANE_MODE_ACTIVE,
    LANE_STATUS_PAUSED,
    ORDER_OUTCOME_FAILED,
    ORDER_OUTCOME_SKIPPED,
    REASON_CIRCUIT_BREAKER_OPEN,
    REASON_LANE_DISABLED,
    REASON_MARKET_DISCOVERY_FAILED,
    REASON_MAX_ACTIVE_LANES,
    REASON_ORDER_FAILED,
    REASON_ORDER_REJECTED,
    REASON_TRANSIENT_RETRY_EXHAUSTED,
)


class FundManagerOrchestrator:
    def __init__(
        self,
        *,
        config: dict,
        state_path: str,
        provider=None,
        reliability_layer: ReliabilityLayer | None = None,
    ):
        self.config = config
        self.state_path = state_path
        self.provider = provider or load_provider(config)
        self.reliability = reliability_layer or ReliabilityLayer(
            price_cache_ttl_seconds=int(config.get("global", {}).get("price_cache_ttl_seconds", 20))
        )

    def _lane_cooldown_until(self, policy, now):
        return isoformat(now + timedelta(minutes=policy.market_cooldown_minutes))

    def _failure_cooldown_until(self, policy, now):
        return isoformat(now + timedelta(minutes=policy.failure_cooldown_minutes))

    def _circuit_breaker_until(self, policy, now):
        return isoformat(now + timedelta(minutes=policy.failure_circuit_cooloff_minutes))

    def _result_cooldown_until(self, policy, result, now):
        if result.outcome == ORDER_OUTCOME_FAILED or result.reason_code in {
            REASON_ORDER_FAILED,
            REASON_ORDER_REJECTED,
            REASON_TRANSIENT_RETRY_EXHAUSTED,
        }:
            return self._failure_cooldown_until(policy, now)
        return self._lane_cooldown_until(policy, now)

    def run_cycle(self) -> dict[str, Any]:
        state = load_state(self.state_path)
        now = utcnow()
        now_iso = isoformat(now)
        wallet = self.provider.get_wallet_state()
        active_limit = int(self.config.get("global", {}).get("max_active_lanes", 2))
        wallet_config = self.config.get("wallet", {})
        retry_policy = self.config.get("global", {})

        policies = get_lane_policies(self.config)
        active_slots_used = 0

        for policy in policies:
            lane_state = ensure_lane_state(state, policy)
            lane_state["mode"] = policy.mode
            lane_state["name"] = policy.name
            prune_market_cooldowns(lane_state, now_iso)
            resume_circuit_breaker_if_elapsed(lane_state, now_iso=now_iso)

            if policy.mode == LANE_MODE_ACTIVE and active_slots_used >= active_limit:
                lane_state["status"] = LANE_STATUS_PAUSED
                lane_state["last_cycle_at"] = now_iso
                lane_state["last_reason_code"] = REASON_MAX_ACTIVE_LANES
                lane_state["next_action"] = "waiting_for_capital_slot"
                append_lane_event(
                    lane_state,
                    now_iso=now_iso,
                    message=f"{policy.name} paused by max active lane cap",
                    payload={"reason_code": REASON_MAX_ACTIVE_LANES},
                )
                append_recent_action(
                    state,
                    now_iso=now_iso,
                    lane_id=policy.lane_id,
                    message=f"{policy.name}: paused by bankroll lane cap",
                )
                continue

            if policy.mode == LANE_MODE_ACTIVE:
                active_slots_used += 1

            if policy.mode == "disabled":
                lane_state["status"] = LANE_STATUS_PAUSED
                lane_state["last_cycle_at"] = now_iso
                lane_state["last_reason_code"] = REASON_LANE_DISABLED
                lane_state["next_action"] = "disabled_by_policy"
                append_lane_event(
                    lane_state,
                    now_iso=now_iso,
                    message=f"{policy.name} disabled by lane policy",
                    payload={"reason_code": REASON_LANE_DISABLED},
                )
                continue

            try:
                candidates = self.provider.get_lane_candidates(policy.lane_id, policy.candidate_limit)
            except ProviderError as error:
                lane_state["status"] = "DEGRADED"
                lane_state["last_cycle_at"] = now_iso
                lane_state["last_reason_code"] = error.reason_code or REASON_MARKET_DISCOVERY_FAILED
                lane_state["last_error_class"] = "transient" if error.transient else "hard_failure"
                lane_state["next_action"] = "retry_market_discovery"
                append_lane_event(
                    lane_state,
                    now_iso=now_iso,
                    message=f"{policy.name} market discovery failed",
                    payload={"reason_code": error.reason_code or REASON_MARKET_DISCOVERY_FAILED, "message": str(error)},
                )
                append_recent_action(
                    state,
                    now_iso=now_iso,
                    lane_id=policy.lane_id,
                    message=f"{policy.name}: market discovery failed",
                    payload={"message": str(error)},
                )
                continue

            limits = self.provider.get_platform_limits("polymarket")
            result = self.reliability.execute_lane(
                provider=self.provider,
                wallet=wallet,
                limits=limits,
                lane_policy=policy,
                lane_state=lane_state,
                wallet_config=wallet_config,
                retry_policy=retry_policy,
                candidates=candidates,
            )
            note_result(lane_state, result, now_iso=now_iso)

            if result.reason_code == REASON_CIRCUIT_BREAKER_OPEN:
                lane_state["status"] = LANE_STATUS_PAUSED

            if result.reason_code and result.market_id and result.reason_code in COOLDOWN_REASON_CODES:
                set_market_cooldown(
                    lane_state,
                    result.market_id,
                    until=self._result_cooldown_until(policy, result, now),
                    reason_code=result.reason_code,
                )

            if result.outcome == ORDER_OUTCOME_FAILED:
                circuit = lane_state.setdefault("circuit_breaker", {})
                threshold = int(circuit.get("threshold", policy.failure_circuit_threshold))
                if int(lane_state.get("consecutive_failures", 0)) >= threshold:
                    circuit["open"] = True
                    circuit["open_until"] = self._circuit_breaker_until(policy, now)
                    lane_state["status"] = LANE_STATUS_PAUSED
                    lane_state["next_action"] = "resume_after_cooloff"

            message_bits = [policy.name, result.outcome.upper()]
            if result.market_id:
                message_bits.append(result.market_id)
            if result.reason_code:
                message_bits.append(result.reason_code)
            append_lane_event(
                lane_state,
                now_iso=now_iso,
                message=" | ".join(message_bits),
                payload=result.details,
            )
            append_recent_action(
                state,
                now_iso=now_iso,
                lane_id=policy.lane_id,
                message=" | ".join(message_bits),
                payload=result.details,
            )

        state["generated_at"] = now_iso
        summarize_state(state, self.config)
        save_state(self.state_path, state)
        return state
