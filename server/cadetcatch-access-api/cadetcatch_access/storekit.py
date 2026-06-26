from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from time import time
from typing import Any, Iterable


DEFAULT_BUNDLE_ID = "co.eb28.cadetcatch"
DEFAULT_APPLE_APP_ID = 6769565852
DEFAULT_MONTHLY_PRODUCT_ID = "co.eb28.cadetcatch.family.monthly.v1"
AUTO_RENEWABLE_SUBSCRIPTION = "Auto-Renewable Subscription"


class StoreKitConfigurationError(RuntimeError):
    pass


class StoreKitVerificationError(RuntimeError):
    pass


@dataclass(frozen=True)
class StoreKitLinkRequest:
    product_id: str
    transaction_id: str
    original_transaction_id: str


@dataclass(frozen=True)
class VerifiedSubscription:
    product_id: str
    transaction_id: str
    original_transaction_id: str
    expires_at: str | None


def configured_product_ids() -> set[str]:
    raw = os.getenv("CADETCATCH_VALID_SUBSCRIPTION_PRODUCT_IDS", DEFAULT_MONTHLY_PRODUCT_ID)
    return {item.strip() for item in raw.split(",") if item.strip()}


def environment_name() -> str:
    return os.getenv("CADETCATCH_APPLE_ENVIRONMENT", "production").strip().lower()


def now_ms() -> int:
    return int(time() * 1000)


def millis_to_iso(value: int | None) -> str | None:
    if value is None:
        return None
    from datetime import datetime, timezone

    return datetime.fromtimestamp(value / 1000, timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def attr_value(decoded: Any, attr: str) -> Any:
    return getattr(decoded, attr, None)


def enum_value(value: Any) -> str | None:
    if value is None:
        return None
    raw = getattr(value, "value", None)
    return str(raw if raw is not None else value)


def validate_decoded_subscription(
    decoded: Any,
    request: StoreKitLinkRequest,
    *,
    expected_bundle_id: str,
    valid_product_ids: Iterable[str],
    current_time_ms: int | None = None,
) -> VerifiedSubscription:
    valid_products = set(valid_product_ids)
    product_id = attr_value(decoded, "productId")
    transaction_id = attr_value(decoded, "transactionId")
    original_transaction_id = attr_value(decoded, "originalTransactionId")
    bundle_id = attr_value(decoded, "bundleId")
    raw_type = enum_value(attr_value(decoded, "type")) or attr_value(decoded, "rawType")
    expires_date = attr_value(decoded, "expiresDate")
    revocation_date = attr_value(decoded, "revocationDate")

    if bundle_id != expected_bundle_id:
        raise StoreKitVerificationError("Apple transaction bundle ID did not match CadetCatch.")
    if product_id != request.product_id or product_id not in valid_products:
        raise StoreKitVerificationError("Apple transaction product ID is not an active CadetCatch subscription product.")
    if transaction_id != request.transaction_id:
        raise StoreKitVerificationError("Apple transaction ID did not match the linked transaction.")
    if original_transaction_id != request.original_transaction_id:
        raise StoreKitVerificationError("Apple original transaction ID did not match the linked subscription.")
    if raw_type != AUTO_RENEWABLE_SUBSCRIPTION:
        raise StoreKitVerificationError("Apple transaction is not an auto-renewable subscription.")
    if revocation_date is not None:
        raise StoreKitVerificationError("Apple transaction has been revoked.")
    if expires_date is None:
        raise StoreKitVerificationError("Apple subscription transaction does not include an expiration date.")
    if int(expires_date) <= (current_time_ms or now_ms()):
        raise StoreKitVerificationError("Apple subscription is expired.")

    return VerifiedSubscription(
        product_id=str(product_id),
        transaction_id=str(transaction_id),
        original_transaction_id=str(original_transaction_id),
        expires_at=millis_to_iso(int(expires_date)),
    )


def read_signing_key() -> bytes:
    key_inline = os.getenv("CADETCATCH_APPLE_PRIVATE_KEY_P8")
    if key_inline:
        return key_inline.replace("\\n", "\n").encode("utf-8")
    key_path = os.getenv("CADETCATCH_APPLE_PRIVATE_KEY_PATH")
    if key_path:
        return Path(key_path).read_bytes()
    raise StoreKitConfigurationError("CADETCATCH_APPLE_PRIVATE_KEY_P8 or CADETCATCH_APPLE_PRIVATE_KEY_PATH is required.")


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise StoreKitConfigurationError(f"{name} is required.")
    return value


def load_root_certificates() -> list[bytes]:
    cert_paths = [item.strip() for item in os.getenv("CADETCATCH_APPLE_ROOT_CERT_PATHS", "").split(",") if item.strip()]
    cert_dir = os.getenv("CADETCATCH_APPLE_ROOT_CERT_DIR", "").strip()
    if cert_dir:
        cert_paths.extend(str(path) for path in sorted(Path(cert_dir).glob("*.cer")))
        cert_paths.extend(str(path) for path in sorted(Path(cert_dir).glob("*.pem")))
    certificates = [Path(path).read_bytes() for path in cert_paths]
    if not certificates:
        raise StoreKitConfigurationError("CADETCATCH_APPLE_ROOT_CERT_PATHS or CADETCATCH_APPLE_ROOT_CERT_DIR is required.")
    return certificates


def apple_environment():
    from appstoreserverlibrary.models.Environment import Environment

    name = environment_name()
    if name == "production":
        return Environment.PRODUCTION
    if name == "sandbox":
        return Environment.SANDBOX
    raise StoreKitConfigurationError("CADETCATCH_APPLE_ENVIRONMENT must be production or sandbox.")


class AppleStoreKitVerifier:
    def __init__(
        self,
        *,
        client: Any,
        signed_data_verifier: Any,
        bundle_id: str,
        valid_product_ids: set[str],
    ) -> None:
        self.client = client
        self.signed_data_verifier = signed_data_verifier
        self.bundle_id = bundle_id
        self.valid_product_ids = valid_product_ids

    @classmethod
    def from_env(cls) -> "AppleStoreKitVerifier":
        from appstoreserverlibrary.api_client import AppStoreServerAPIClient
        from appstoreserverlibrary.signed_data_verifier import SignedDataVerifier

        bundle_id = os.getenv("CADETCATCH_APPLE_BUNDLE_ID", DEFAULT_BUNDLE_ID).strip()
        app_apple_id = int(os.getenv("CADETCATCH_APPLE_APP_APPLE_ID", str(DEFAULT_APPLE_APP_ID)))
        environment = apple_environment()
        signing_key = read_signing_key()
        key_id = required_env("CADETCATCH_APPLE_KEY_ID")
        issuer_id = required_env("CADETCATCH_APPLE_ISSUER_ID")
        root_certificates = load_root_certificates()
        online_checks = os.getenv("CADETCATCH_APPLE_ENABLE_ONLINE_CHECKS", "").strip().lower() in {"1", "true", "yes", "on"}

        client = AppStoreServerAPIClient(signing_key, key_id, issuer_id, bundle_id, environment)
        signed_data_verifier = SignedDataVerifier(
            root_certificates,
            online_checks,
            environment,
            bundle_id,
            app_apple_id if environment_name() == "production" else None,
        )
        return cls(
            client=client,
            signed_data_verifier=signed_data_verifier,
            bundle_id=bundle_id,
            valid_product_ids=configured_product_ids(),
        )

    def verify(self, request: StoreKitLinkRequest) -> VerifiedSubscription:
        response = self.client.get_transaction_info(request.transaction_id)
        signed_transaction = getattr(response, "signedTransactionInfo", None)
        if not signed_transaction:
            raise StoreKitVerificationError("Apple did not return signed transaction info.")
        decoded = self.signed_data_verifier.verify_and_decode_signed_transaction(signed_transaction)
        return validate_decoded_subscription(
            decoded,
            request,
            expected_bundle_id=self.bundle_id,
            valid_product_ids=self.valid_product_ids,
        )
