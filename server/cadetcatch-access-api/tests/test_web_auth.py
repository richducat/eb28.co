import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cadetcatch_access.store import AccessStore


SECRET = "test-web-auth-secret-that-is-long-enough-1234567890"


class WebAuthStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AccessStore(Path(self.tmp.name) / "access.sqlite3")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def sign_in(self, email: str) -> tuple[str, dict]:
        challenge_id, code = self.store.create_web_login_challenge(
            email=email,
            secret=SECRET,
        )
        return self.store.verify_web_login_challenge(
            challenge_id=challenge_id,
            email=email,
            code=code,
            secret=SECRET,
        )

    def test_active_family_owner_receives_subscriber_access(self) -> None:
        self.store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            can_invite=True,
        )

        token, session = self.sign_in("OWNER@example.com")

        self.assertTrue(session["authenticated"])
        self.assertTrue(session["subscriber_access"])
        self.assertEqual(session["reason"], "active_family_subscription")
        self.assertTrue(self.store.web_session(token=token, secret=SECRET)["subscriber_access"])

    def test_active_family_invite_rechecks_owner_subscription(self) -> None:
        self.store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            can_invite=True,
        )
        invitation = self.store.create_invitation(
            owner_email="owner@example.com",
            role="spouse_or_family",
            recipient_email="family@example.com",
            public_base_url="https://api.cadetcatch.com",
        )
        self.store.redeem_invitation(
            invite_token=invitation.token,
            recipient_email="family@example.com",
            device_id="test-device",
        )

        self.assertTrue(self.store.web_entitlement(email="family@example.com")["subscriber_access"])

        with self.store.connect() as conn:
            conn.execute(
                "UPDATE access_accounts SET active = 0 WHERE email = ?",
                ("owner@example.com",),
            )

        entitlement = self.store.web_entitlement(email="family@example.com")
        self.assertFalse(entitlement["subscriber_access"])
        self.assertEqual(entitlement["reason"], "family_owner_subscription_inactive")

    def test_complimentary_user_is_authorized(self) -> None:
        self.store.grant_access(
            email="guest@example.com",
            access_type="comp",
            role="internal",
        )

        _, session = self.sign_in("guest@example.com")

        self.assertTrue(session["subscriber_access"])
        self.assertEqual(session["reason"], "active_complimentary_grant")

    def test_inactive_and_unknown_users_authenticate_but_get_paywall(self) -> None:
        expired = (
            datetime.now(timezone.utc) - timedelta(days=1)
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        self.store.grant_access(
            email="inactive@example.com",
            access_type="subscriber",
            role="owner",
            expires_at=expired,
        )

        _, inactive = self.sign_in("inactive@example.com")
        _, unknown = self.sign_in("unknown@example.com")

        self.assertTrue(inactive["authenticated"])
        self.assertFalse(inactive["subscriber_access"])
        self.assertEqual(inactive["reason"], "subscription_inactive")
        self.assertTrue(unknown["authenticated"])
        self.assertFalse(unknown["subscriber_access"])
        self.assertEqual(unknown["reason"], "account_not_found")

    def test_codes_are_one_time_and_failed_attempts_are_persisted(self) -> None:
        challenge_id, code = self.store.create_web_login_challenge(
            email="owner@example.com",
            secret=SECRET,
        )
        with self.assertRaises(PermissionError):
            self.store.verify_web_login_challenge(
                challenge_id=challenge_id,
                email="owner@example.com",
                code="000000" if code != "000000" else "000001",
                secret=SECRET,
            )
        with self.store.connect() as conn:
            row = conn.execute(
                "SELECT attempts, code_digest FROM web_login_challenges WHERE id = ?",
                (challenge_id,),
            ).fetchone()
        self.assertEqual(row["attempts"], 1)
        self.assertNotEqual(row["code_digest"], code)

        token, _ = self.store.verify_web_login_challenge(
            challenge_id=challenge_id,
            email="owner@example.com",
            code=code,
            secret=SECRET,
        )
        with self.assertRaises(PermissionError):
            self.store.verify_web_login_challenge(
                challenge_id=challenge_id,
                email="owner@example.com",
                code=code,
                secret=SECRET,
            )
        with self.store.connect() as conn:
            session_row = conn.execute("SELECT token_digest FROM web_sessions").fetchone()
        self.assertNotEqual(session_row["token_digest"], token)

    def test_logout_and_expired_sessions_fail_closed(self) -> None:
        token, _ = self.sign_in("unknown@example.com")
        self.assertTrue(self.store.revoke_web_session(token=token, secret=SECRET))
        self.assertIsNone(self.store.web_session(token=token, secret=SECRET))

        challenge_id, code = self.store.create_web_login_challenge(
            email="another@example.com",
            secret=SECRET,
        )
        expired_token, _ = self.store.verify_web_login_challenge(
            challenge_id=challenge_id,
            email="another@example.com",
            code=code,
            secret=SECRET,
            session_ttl_seconds=60,
        )
        with self.store.connect() as conn:
            conn.execute(
                "UPDATE web_sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE email = ?",
                ("another@example.com",),
            )
        self.assertIsNone(self.store.web_session(token=expired_token, secret=SECRET))

    def test_rate_limit_is_enforced(self) -> None:
        for _ in range(5):
            self.store.create_web_login_challenge(
                email="rate@example.com",
                secret=SECRET,
            )
        with self.assertRaises(PermissionError):
            self.store.create_web_login_challenge(
                email="rate@example.com",
                secret=SECRET,
            )


if __name__ == "__main__":
    unittest.main()
