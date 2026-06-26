import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from cadetcatch_access.mailer import InviteMailer
from cadetcatch_access.main import InvitationRequest, create_invitation
from cadetcatch_access.store import AccessStore


class AccessAPITests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "access.sqlite3"
        self.store = AccessStore(self.db_path)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def grant_owner(self) -> None:
        self.store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            can_invite=True,
        )

    def console_mailer(self) -> InviteMailer:
        return InviteMailer(
            mode="console",
            from_email="support@eb28.co",
            from_name="CadetCatch",
            smtp_host="",
            smtp_port=587,
            smtp_username="",
            smtp_password="",
            use_tls=True,
            use_ssl=False,
        )

    def disabled_mailer(self) -> InviteMailer:
        return InviteMailer(
            mode="disabled",
            from_email="support@eb28.co",
            from_name="CadetCatch",
            smtp_host="",
            smtp_port=587,
            smtp_username="",
            smtp_password="",
            use_tls=True,
            use_ssl=False,
        )

    def test_invitation_endpoint_sends_email_without_returning_raw_url(self) -> None:
        self.grant_owner()

        with patch("builtins.print"):
            payload = create_invitation(
                InvitationRequest(
                    device_id="device-a",
                    owner_email="owner@example.com",
                    role="cadet",
                    recipient_email="cadet@example.com",
                ),
                access_store=self.store,
                mailer=self.console_mailer(),
            )

        self.assertTrue(payload["sent"])
        self.assertEqual(payload["delivery"], "email")
        self.assertEqual(payload["recipient_email"], "cadet@example.com")
        self.assertNotIn("invite_url", payload)

    def test_invitation_endpoint_fails_closed_when_email_is_disabled(self) -> None:
        self.grant_owner()

        with self.assertRaises(HTTPException) as caught:
            create_invitation(
                InvitationRequest(
                    device_id="device-a",
                    owner_email="owner@example.com",
                    role="spouse_or_family",
                    recipient_email="family@example.com",
                ),
                access_store=self.store,
                mailer=self.disabled_mailer(),
            )

        self.assertEqual(caught.exception.status_code, 503)
        invitations = self.store.list_invitations(owner_email="owner@example.com")
        self.assertEqual(invitations[0]["status"], "delivery_failed")


if __name__ == "__main__":
    unittest.main()
