import asyncio
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException, UploadFile

from cadetcatch_access.mailer import InviteMailer
from cadetcatch_access.main import (
    InvitationRequest,
    access_status,
    create_invitation,
    redeem_invite_form,
    redeem_invite_page,
    read_limited_upload,
)
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

    def test_desktop_upload_limit_rejects_oversized_photo(self) -> None:
        upload = UploadFile(filename="large.jpg", file=BytesIO(b"12345"))

        with self.assertRaises(HTTPException) as context:
            asyncio.run(read_limited_upload(upload, max_bytes=4))

        self.assertEqual(context.exception.status_code, 413)

    def test_desktop_upload_limit_accepts_bounded_photo(self) -> None:
        upload = UploadFile(filename="photo.jpg", file=BytesIO(b"1234"))

        content = asyncio.run(read_limited_upload(upload, max_bytes=4))

        self.assertEqual(content, b"1234")

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

    def test_redeem_invite_page_renders_email_bound_form(self) -> None:
        response = redeem_invite_page(token="a" * 32)
        html = response.body.decode("utf-8")

        self.assertEqual(response.status_code, 200)
        self.assertIn('action="/access/redeem"', html)
        self.assertIn('name="invite_token"', html)
        self.assertIn("a" * 32, html)
        self.assertIn("Email address", html)

    def test_auto_admin_status_enables_desktop_access(self) -> None:
        payload = access_status(
            device_id="desktop-check",
            email="fishkn@upmc.edu",
            access_store=self.store,
        )

        self.assertTrue(payload["active"])
        self.assertTrue(payload["desktop_add_on_active"])
        self.assertEqual(payload["access_type"], "comp")
        self.assertEqual(payload["role"], "internal_admin")
        self.assertEqual(payload["device_id"], "desktop-check")

    def test_redeem_invite_form_activates_access(self) -> None:
        self.grant_owner()
        invitation = self.store.create_invitation(
            owner_email="owner@example.com",
            role="spouse_or_family",
            recipient_email="family@example.com",
            public_base_url="https://api.cadetcatch.com",
        )

        response = redeem_invite_form(
            invite_token=invitation.token,
            recipient_email="family@example.com",
            device_id="web-device-a",
            access_store=self.store,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("Access Activated", response.body.decode("utf-8"))
        status = self.store.status(email="family@example.com")
        self.assertTrue(status["active"])
        self.assertEqual(status["access_type"], "family_invite")
        self.assertEqual(status["role"], "spouse_or_family")

    def test_redeem_invite_form_rejects_wrong_email(self) -> None:
        self.grant_owner()
        invitation = self.store.create_invitation(
            owner_email="owner@example.com",
            role="cadet",
            recipient_email="cadet@example.com",
            public_base_url="https://api.cadetcatch.com",
        )

        response = redeem_invite_form(
            invite_token=invitation.token,
            recipient_email="wrong@example.com",
            device_id="web-device-a",
            access_store=self.store,
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Invite Could Not Be Activated", response.body.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
