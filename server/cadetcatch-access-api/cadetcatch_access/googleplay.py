from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_PACKAGE_NAME = "co.eb28.cadetcatch"
DEFAULT_MONTHLY_PRODUCT_ID = "co.eb28.cadetcatch.family.monthly.v1"
ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher"


class GooglePlayConfigurationError(RuntimeError):
    pass


class GooglePlayVerificationError(RuntimeError):
    pass


@dataclass(frozen=True)
class GooglePlayLinkRequest:
    package_name: str
    product_id: str
    purchase_token: str


@dataclass(frozen=True)
class VerifiedGooglePlaySubscription:
    product_id: str
    purchase_token: str
    order_id: str | None
    expires_at: str | None


def configured_product_ids() -> set[str]:
    raw = os.getenv("CADETCATCH_GOOGLE_PLAY_PRODUCT_IDS", DEFAULT_MONTHLY_PRODUCT_ID)
    return {item.strip() for item in raw.split(",") if item.strip()}


def expected_package_name() -> str:
    return os.getenv("CADETCATCH_GOOGLE_PLAY_PACKAGE_NAME", DEFAULT_PACKAGE_NAME).strip()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def millis_to_iso(value: int | str | None) -> str | None:
    if value is None:
        return None
    return datetime.fromtimestamp(int(value) / 1000, timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_rfc3339(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.replace("Z", "+00:00")
    return datetime.fromisoformat(cleaned).astimezone(timezone.utc)


def validate_google_play_payload(
    payload: dict[str, Any],
    request: GooglePlayLinkRequest,
    *,
    valid_product_ids: set[str],
    current_time: datetime | None = None,
) -> VerifiedGooglePlaySubscription:
    current = current_time or now_utc()
    product_id = None
    expires_at = None
    order_id = payload.get("orderId") or payload.get("latestOrderId")

    if "lineItems" in payload:
        line_items = payload.get("lineItems") or []
        for item in line_items:
            candidate_id = item.get("productId")
            if candidate_id == request.product_id:
                product_id = candidate_id
                expires_at = item.get("expiryTime")
                break
        if product_id is None and line_items:
            product_id = line_items[0].get("productId")
            expires_at = line_items[0].get("expiryTime")
        state = payload.get("subscriptionState", "")
        if state in {"SUBSCRIPTION_STATE_EXPIRED", "SUBSCRIPTION_STATE_CANCELED_WITHOUT_REPLACEMENT"}:
            raise GooglePlayVerificationError("Google Play subscription is not active.")
        expiry_dt = parse_rfc3339(expires_at)
        expires_iso = expiry_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z") if expiry_dt else None
    else:
        product_id = request.product_id
        expires_iso = millis_to_iso(payload.get("expiryTimeMillis"))
        expiry_dt = parse_rfc3339(expires_iso)
        if payload.get("cancelReason") in {1, 2, 3}:
            raise GooglePlayVerificationError("Google Play subscription was canceled or replaced.")

    if request.package_name != expected_package_name():
        raise GooglePlayVerificationError("Google Play package name did not match CadetCatch.")
    if product_id != request.product_id or product_id not in valid_product_ids:
        raise GooglePlayVerificationError("Google Play product ID is not an active CadetCatch subscription product.")
    if expiry_dt is None:
        raise GooglePlayVerificationError("Google Play subscription did not include an expiration time.")
    if expiry_dt <= current:
        raise GooglePlayVerificationError("Google Play subscription is expired.")

    return VerifiedGooglePlaySubscription(
        product_id=str(product_id),
        purchase_token=request.purchase_token,
        order_id=str(order_id) if order_id else None,
        expires_at=expires_iso,
    )


def load_service_account_info() -> dict[str, Any]:
    inline = os.getenv("CADETCATCH_GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if inline:
        return json.loads(inline)
    path = os.getenv("CADETCATCH_GOOGLE_SERVICE_ACCOUNT_PATH", "").strip()
    if path:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    raise GooglePlayConfigurationError("CADETCATCH_GOOGLE_SERVICE_ACCOUNT_JSON or CADETCATCH_GOOGLE_SERVICE_ACCOUNT_PATH is required.")


class GooglePlayVerifier:
    def __init__(self, *, session: Any, package_name: str, valid_product_ids: set[str]) -> None:
        self.session = session
        self.package_name = package_name
        self.valid_product_ids = valid_product_ids

    @classmethod
    def from_env(cls) -> "GooglePlayVerifier":
        try:
            from google.auth.transport.requests import AuthorizedSession
            from google.oauth2 import service_account
        except ImportError as error:
            raise GooglePlayConfigurationError("google-auth is required for Google Play verification.") from error

        credentials = service_account.Credentials.from_service_account_info(
            load_service_account_info(),
            scopes=[ANDROID_PUBLISHER_SCOPE],
        )
        return cls(
            session=AuthorizedSession(credentials),
            package_name=expected_package_name(),
            valid_product_ids=configured_product_ids(),
        )

    def verify(self, request: GooglePlayLinkRequest) -> VerifiedGooglePlaySubscription:
        if request.package_name != self.package_name:
            raise GooglePlayVerificationError("Google Play package name did not match CadetCatch.")
        url = (
            "https://androidpublisher.googleapis.com/androidpublisher/v3/"
            f"applications/{request.package_name}/purchases/subscriptionsv2/tokens/{request.purchase_token}"
        )
        response = self.session.get(url, timeout=20)
        if response.status_code == 404:
            legacy_url = (
                "https://androidpublisher.googleapis.com/androidpublisher/v3/"
                f"applications/{request.package_name}/purchases/subscriptions/{request.product_id}/tokens/{request.purchase_token}"
            )
            response = self.session.get(legacy_url, timeout=20)
        if response.status_code < 200 or response.status_code >= 300:
            raise GooglePlayVerificationError("Google Play purchase token could not be verified.")
        return validate_google_play_payload(
            response.json(),
            request,
            valid_product_ids=self.valid_product_ids,
        )
