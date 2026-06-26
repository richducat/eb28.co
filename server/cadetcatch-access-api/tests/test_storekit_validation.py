import unittest
from types import SimpleNamespace

from cadetcatch_access.storekit import (
    AUTO_RENEWABLE_SUBSCRIPTION,
    DEFAULT_BUNDLE_ID,
    DEFAULT_MONTHLY_PRODUCT_ID,
    StoreKitLinkRequest,
    StoreKitVerificationError,
    validate_decoded_subscription,
)


class StoreKitValidationTests(unittest.TestCase):
    def request(self) -> StoreKitLinkRequest:
        return StoreKitLinkRequest(
            product_id=DEFAULT_MONTHLY_PRODUCT_ID,
            transaction_id="1000000000000001",
            original_transaction_id="1000000000000000",
        )

    def decoded(self, **overrides):
        values = {
            "bundleId": DEFAULT_BUNDLE_ID,
            "productId": DEFAULT_MONTHLY_PRODUCT_ID,
            "transactionId": "1000000000000001",
            "originalTransactionId": "1000000000000000",
            "type": AUTO_RENEWABLE_SUBSCRIPTION,
            "expiresDate": 4102444800000,
            "revocationDate": None,
        }
        values.update(overrides)
        return SimpleNamespace(**values)

    def verify(self, decoded):
        return validate_decoded_subscription(
            decoded,
            self.request(),
            expected_bundle_id=DEFAULT_BUNDLE_ID,
            valid_product_ids={DEFAULT_MONTHLY_PRODUCT_ID},
            current_time_ms=1767225600000,
        )

    def test_accepts_active_matching_subscription(self):
        verified = self.verify(self.decoded())

        self.assertEqual(verified.product_id, DEFAULT_MONTHLY_PRODUCT_ID)
        self.assertEqual(verified.transaction_id, "1000000000000001")
        self.assertEqual(verified.original_transaction_id, "1000000000000000")
        self.assertEqual(verified.expires_at, "2100-01-01T00:00:00Z")

    def test_rejects_wrong_product(self):
        with self.assertRaises(StoreKitVerificationError):
            self.verify(self.decoded(productId="co.eb28.cadetcatch.photo.unlock.v1"))

    def test_rejects_wrong_bundle(self):
        with self.assertRaises(StoreKitVerificationError):
            self.verify(self.decoded(bundleId="co.eb28.otherapp"))

    def test_rejects_expired_subscription(self):
        with self.assertRaises(StoreKitVerificationError):
            self.verify(self.decoded(expiresDate=1000))

    def test_rejects_revoked_subscription(self):
        with self.assertRaises(StoreKitVerificationError):
            self.verify(self.decoded(revocationDate=2000))


if __name__ == "__main__":
    unittest.main()
