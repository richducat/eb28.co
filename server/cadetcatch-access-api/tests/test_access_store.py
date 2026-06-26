import tempfile
import unittest
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


if __name__ == "__main__":
    unittest.main()
