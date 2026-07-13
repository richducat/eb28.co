import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

from cadetcatch_access.main import (
    WebLoginStartRequest,
    WebLoginVerifyRequest,
    get_web_session,
    logout_web_session,
    require_web_gateway,
    start_web_login,
    verify_web_login,
)
from cadetcatch_access.store import AccessStore


SECRET = "test-web-auth-secret-that-is-at-least-32-characters"
GATEWAY = "test-web-gateway-key-that-is-at-least-32-characters"


class WebAuthAPITests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = AccessStore(Path(self.tmp.name) / "access.sqlite3")
        class CaptureMailer:
            code = ""

            def send_login_code(inner_self, email: str, code: str) -> None:
                inner_self.code = code

        self.mailer = CaptureMailer()
        self.env = {
            "CADETCATCH_WEB_AUTH_SECRET": SECRET,
            "CADETCATCH_WEB_GATEWAY_KEY": GATEWAY,
        }

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_passwordless_flow_returns_session_and_revalidates_entitlement(self) -> None:
        self.store.grant_access(
            email="owner@example.com",
            access_type="subscriber",
            role="owner",
            can_invite=True,
        )
        with patch.dict(os.environ, self.env, clear=False):
            started = start_web_login(
                WebLoginStartRequest(email="owner@example.com"),
                access_store=self.store,
                mailer=self.mailer,
            )
            code = self.mailer.code
            verified = verify_web_login(
                WebLoginVerifyRequest(
                    challenge_id=started["challenge_id"],
                    email="owner@example.com",
                    code=code,
                ),
                access_store=self.store,
            )
            session = get_web_session(
                authorization=f"Bearer {verified['session_token']}",
                access_store=self.store,
            )
            self.assertTrue(session["authenticated"])
            self.assertTrue(session["subscriber_access"])

            logged_out = logout_web_session(
                authorization=f"Bearer {verified['session_token']}",
                access_store=self.store,
            )
            self.assertTrue(logged_out["logged_out"])
            with self.assertRaises(HTTPException) as caught:
                get_web_session(
                    authorization=f"Bearer {verified['session_token']}",
                    access_store=self.store,
                )
            self.assertEqual(caught.exception.status_code, 401)

    def test_gateway_key_fails_closed(self) -> None:
        with patch.dict(os.environ, self.env, clear=False):
            require_web_gateway(x_cadetcatch_gateway_key=GATEWAY)
            with self.assertRaises(HTTPException) as caught:
                require_web_gateway(x_cadetcatch_gateway_key="wrong")
            self.assertEqual(caught.exception.status_code, 403)

        with patch.dict(os.environ, {"CADETCATCH_WEB_GATEWAY_KEY": ""}, clear=False):
            with self.assertRaises(HTTPException) as caught:
                require_web_gateway(x_cadetcatch_gateway_key=GATEWAY)
            self.assertEqual(caught.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
