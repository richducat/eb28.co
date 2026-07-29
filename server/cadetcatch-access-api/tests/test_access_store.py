import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cadetcatch_access.store import AccessStore


class AccessStoreTests(unittest.TestCase):
    def make_store(self) -> AccessStore:
        self.tmp = tempfile.TemporaryDirectory()
        return AccessStore(Path(self.tmp.name) / "access.sqlite3")

    def tearDown(self) -> None:
        tmp = getattr(self, "tmp", None)
        if tmp is not None:
            tmp.cleanup()

    def test_admin_grant_enables_full_internal_access(self) -> None:
        store = self.make_store()

        status = store.grant_access(
            email="RichDucat@gmail.com",
            access_type="comp",
            role="internal",
            desktop_add_on_active=True,
            can_invite=True,
        )

        self.assertTrue(status["active"])
        self.assertEqual(status["email"], "richducat@gmail.com")
        self.assertEqual(status["access_type"], "comp")
        self.assertEqual(status["role"], "internal")
        self.assertTrue(status["desktop_add_on_active"])

    def test_auto_admin_emails_have_full_desktop_access_without_db_grant(self) -> None:
        store = self.make_store()

        for email in (
            "richard@thankyouforyourservice.co",
            "karen@thankyouforyourservice.co",
            "fishkn@upmc.edu",
        ):
            with self.subTest(email=email):
                status = store.status(email=email.upper())

                self.assertTrue(status["active"])
                self.assertEqual(status["email"], email)
                self.assertEqual(status["access_type"], "comp")
                self.assertEqual(status["role"], "internal_admin")
                self.assertTrue(status["desktop_add_on_active"])
                self.assertTrue(status["can_invite"])

    def test_auto_admin_can_create_family_invites_without_db_grant(self) -> None:
        store = self.make_store()

        invitation = store.create_invitation(
            owner_email="richard@thankyouforyourservice.co",
            role="cadet",
            recipient_email="cadet@example.com",
            public_base_url="https://api.cadetcatch.com",
        )

        self.assertEqual(invitation.owner_email, "richard@thankyouforyourservice.co")
        self.assertEqual(invitation.role, "cadet")
        self.assertEqual(invitation.recipient_email, "cadet@example.com")
        self.assertIn("/access/redeem?token=", invitation.invite_url)

    def test_invite_is_email_bound_and_single_use(self) -> None:
        store = self.make_store()
        store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            can_invite=True,
        )

        invitation = store.create_invitation(
            owner_email="owner@example.com",
            role="spouse_or_family",
            recipient_email="Family@Example.com",
            public_base_url="https://api.cadetcatch.com",
        )
        self.assertIn("/access/redeem?token=", invitation.invite_url)

        with self.assertRaises(PermissionError):
            store.redeem_invitation(
                invite_token=invitation.token,
                recipient_email="wrong@example.com",
                device_id="device-a",
            )

        redeemed = store.redeem_invitation(
            invite_token=invitation.token,
            recipient_email="family@example.com",
            device_id="device-a",
        )
        self.assertTrue(redeemed["active"])
        self.assertEqual(redeemed["access_type"], "family_invite")
        self.assertEqual(redeemed["role"], "spouse_or_family")

        with self.assertRaises(PermissionError):
            store.redeem_invitation(
                invite_token=invitation.token,
                recipient_email="family@example.com",
                device_id="device-b",
            )

    def test_owner_without_invite_permission_cannot_create_invites(self) -> None:
        store = self.make_store()
        store.grant_access(
            email="owner@example.com",
            access_type="comp",
            role="internal",
            can_invite=False,
        )

        with self.assertRaises(PermissionError):
            store.create_invitation(
                owner_email="owner@example.com",
                role="cadet",
                recipient_email="cadet@example.com",
                public_base_url="https://api.cadetcatch.com",
            )

    def test_expired_subscription_status_is_inactive(self) -> None:
        store = self.make_store()
        expired_at = (
            datetime.now(timezone.utc) - timedelta(days=1)
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            desktop_add_on_active=True,
            can_invite=True,
            expires_at=expired_at,
        )

        status = store.status(email="owner@example.com")

        self.assertFalse(status["active"])
        self.assertFalse(status["desktop_add_on_active"])
        self.assertEqual(status["access_type"], "subscriber")

    def test_desktop_password_requires_active_access(self) -> None:
        store = self.make_store()

        with self.assertRaises(PermissionError):
            store.set_desktop_password(
                email="unknown@example.com",
                password="StrongDesktopPassword1!",
            )

    def test_desktop_login_issues_and_revokes_session(self) -> None:
        store = self.make_store()
        store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            can_invite=True,
        )
        store.set_desktop_password(
            email="owner@example.com",
            password="StrongDesktopPassword1!",
        )

        with self.assertRaises(PermissionError):
            store.authenticate_desktop(
                email="owner@example.com",
                password="WrongDesktopPassword1!",
            )

        token = store.authenticate_desktop(
            email="owner@example.com",
            password="StrongDesktopPassword1!",
        )
        session = store.desktop_session(token=token)
        self.assertTrue(session["authenticated"])
        self.assertEqual(session["email"], "owner@example.com")

        store.revoke_desktop_session(token=token)
        with self.assertRaises(PermissionError):
            store.desktop_session(token=token)


if __name__ == "__main__":
    unittest.main()
