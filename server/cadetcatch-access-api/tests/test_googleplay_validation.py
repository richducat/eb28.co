import unittest
from datetime import datetime, timezone

from cadetcatch_access.googleplay import (
    DEFAULT_MONTHLY_PRODUCT_ID,
    DEFAULT_PACKAGE_NAME,
    GooglePlayLinkRequest,
    GooglePlayVerificationError,
    validate_google_play_payload,
)


class GooglePlayValidationTests(unittest.TestCase):
    def request(self) -> GooglePlayLinkRequest:
        return GooglePlayLinkRequest(
            package_name=DEFAULT_PACKAGE_NAME,
            product_id=DEFAULT_MONTHLY_PRODUCT_ID,
            purchase_token="token_abcdefghijklmnopqrstuvwxyz",
        )

    def test_accepts_subscription_v2_active_purchase(self) -> None:
        verified = validate_google_play_payload(
            {
                "latestOrderId": "GPA.1234-5678-9012-34567",
                "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
                "lineItems": [
                    {
                        "productId": DEFAULT_MONTHLY_PRODUCT_ID,
                        "expiryTime": "2100-01-01T00:00:00Z",
                    }
                ],
            },
            self.request(),
            valid_product_ids={DEFAULT_MONTHLY_PRODUCT_ID},
            current_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
        )

        self.assertEqual(verified.product_id, DEFAULT_MONTHLY_PRODUCT_ID)
        self.assertEqual(verified.order_id, "GPA.1234-5678-9012-34567")
        self.assertEqual(verified.expires_at, "2100-01-01T00:00:00Z")

    def test_rejects_wrong_product(self) -> None:
        with self.assertRaises(GooglePlayVerificationError):
            validate_google_play_payload(
                {
                    "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
                    "lineItems": [
                        {
                            "productId": "co.eb28.cadetcatch.other",
                            "expiryTime": "2100-01-01T00:00:00Z",
                        }
                    ],
                },
                self.request(),
                valid_product_ids={DEFAULT_MONTHLY_PRODUCT_ID},
                current_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
            )

    def test_rejects_expired_subscription(self) -> None:
        with self.assertRaises(GooglePlayVerificationError):
            validate_google_play_payload(
                {
                    "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
                    "lineItems": [
                        {
                            "productId": DEFAULT_MONTHLY_PRODUCT_ID,
                            "expiryTime": "2020-01-01T00:00:00Z",
                        }
                    ],
                },
                self.request(),
                valid_product_ids={DEFAULT_MONTHLY_PRODUCT_ID},
                current_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
            )

    def test_accepts_legacy_subscription_payload(self) -> None:
        verified = validate_google_play_payload(
            {
                "orderId": "GPA.1234-5678-9012-34567",
                "expiryTimeMillis": "4102444800000",
            },
            self.request(),
            valid_product_ids={DEFAULT_MONTHLY_PRODUCT_ID},
            current_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
        )

        self.assertEqual(verified.expires_at, "2100-01-01T00:00:00Z")


if __name__ == "__main__":
    unittest.main()
