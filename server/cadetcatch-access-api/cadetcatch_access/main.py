from __future__ import annotations

import os
import secrets
from pathlib import Path
from html import escape

from fastapi import Depends, FastAPI, Form, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, Field

from .mailer import InviteDeliveryError, InviteMailer
from .store import AccessStore
from .storekit import (
    AppleStoreKitVerifier,
    StoreKitConfigurationError,
    StoreKitLinkRequest,
    StoreKitVerificationError,
)


def env_bool(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def database_path() -> Path:
    return Path(os.getenv("CADETCATCH_ACCESS_DB", "/tmp/cadetcatch-access.sqlite3"))


def public_base_url() -> str:
    return os.getenv("CADETCATCH_PUBLIC_BASE_URL", "https://api.cadetcatch.com")


def build_store() -> AccessStore:
    return AccessStore(database_path())


def desktop_page_html() -> str:
    desktop_path = Path(__file__).with_name("desktop.html")
    return desktop_path.read_text(encoding="utf-8")


app = FastAPI(title="CadetCatch Access API", version="1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CADETCATCH_ACCESS_ALLOWED_ORIGINS",
        "https://eb28.co,https://www.eb28.co",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
)


class GrantRequest(BaseModel):
    email: EmailStr
    access_type: str = Field(default="comp", min_length=1, max_length=64)
    role: str = Field(default="internal", min_length=1, max_length=64)
    desktop_add_on_active: bool = False
    can_invite: bool = False
    expires_at: str | None = None
    note: str | None = None


class SubscriptionLinkRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=160)
    email: EmailStr
    product_id: str = Field(min_length=1, max_length=160)
    transaction_id: str = Field(min_length=1, max_length=220)
    original_transaction_id: str = Field(min_length=1, max_length=220)


class InvitationRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=160)
    owner_email: EmailStr
    original_transaction_id: str | None = None
    role: str = Field(min_length=1, max_length=64)
    recipient_email: EmailStr


class RedeemInviteRequest(BaseModel):
    invite_token: str = Field(min_length=16, max_length=240)
    recipient_email: EmailStr
    device_id: str = Field(min_length=1, max_length=160)


class WebLoginStartRequest(BaseModel):
    email: EmailStr


class WebLoginVerifyRequest(BaseModel):
    challenge_id: str = Field(min_length=12, max_length=120)
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


def store() -> AccessStore:
    return build_store()


def storekit_verifier() -> AppleStoreKitVerifier:
    return AppleStoreKitVerifier.from_env()


def invite_mailer() -> InviteMailer:
    return InviteMailer.from_env()


def web_auth_secret() -> str:
    secret = os.getenv("CADETCATCH_WEB_AUTH_SECRET", "")
    if len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web authentication is not configured.",
        )
    return secret


def require_web_gateway(
    x_cadetcatch_gateway_key: str | None = Header(default=None),
) -> None:
    expected = os.getenv("CADETCATCH_WEB_GATEWAY_KEY", "")
    if len(expected) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web gateway access is not configured.",
        )
    if not x_cadetcatch_gateway_key or not secrets.compare_digest(
        x_cadetcatch_gateway_key,
        expected,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return token


def require_admin(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> None:
    expected = os.getenv("CADETCATCH_ACCESS_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is not configured.",
        )
    token = x_admin_token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token or token != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def redeem_page_html(
    *,
    token: str,
    title: str = "Activate CadetCatch Access",
    message: str = "Enter the email address that received this invite.",
    status_text: str = "",
    error: str = "",
    email: str = "",
) -> str:
    escaped_token = escape(token)
    escaped_title = escape(title)
    escaped_message = escape(message)
    escaped_status = escape(status_text)
    escaped_error = escape(error)
    escaped_email = escape(email)
    device_seed = secrets.token_urlsafe(16)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escaped_title}</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #eef4fb;
      --card: #ffffff;
      --ink: #06152b;
      --muted: #66748a;
      --border: #d8e1ee;
      --accent: #ff4f18;
      --accent-dark: #d83c0c;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: radial-gradient(circle at top, #ffffff 0, var(--bg) 52%, #e6edf7 100%);
      color: var(--ink);
    }}
    main {{
      width: min(100%, 440px);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 18px 45px rgba(6, 21, 43, 0.12);
      padding: 28px;
    }}
    .brand {{
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }}
    h1 {{
      margin: 0;
      font-size: clamp(28px, 9vw, 38px);
      line-height: 1.02;
      letter-spacing: 0;
    }}
    p {{
      margin: 14px 0 0;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.45;
    }}
    form {{ margin-top: 22px; }}
    label {{
      display: block;
      margin-bottom: 8px;
      font-weight: 800;
      font-size: 14px;
    }}
    input {{
      width: 100%;
      min-height: 52px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 0 14px;
      color: var(--ink);
      font: inherit;
      background: #f9fbfe;
    }}
    button {{
      width: 100%;
      min-height: 54px;
      margin-top: 16px;
      border: 0;
      border-radius: 16px;
      background: var(--accent);
      color: white;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
    }}
    button:active {{ background: var(--accent-dark); }}
    .status {{
      margin-top: 18px;
      padding: 12px 14px;
      border-radius: 14px;
      background: #ecfff5;
      color: #0d6b3f;
      font-weight: 800;
    }}
    .error {{
      margin-top: 18px;
      padding: 12px 14px;
      border-radius: 14px;
      background: #fff1ed;
      color: #a33112;
      font-weight: 800;
    }}
    .fine {{
      margin-top: 18px;
      font-size: 13px;
    }}
  </style>
</head>
<body>
  <main>
    <p class="brand">CadetCatch</p>
    <h1>{escaped_title}</h1>
    <p>{escaped_message}</p>
    {f'<div class="status">{escaped_status}</div>' if escaped_status else ''}
    {f'<div class="error">{escaped_error}</div>' if escaped_error else ''}
    <form method="post" action="/access/redeem">
      <input type="hidden" name="invite_token" value="{escaped_token}">
      <input type="hidden" name="device_id" id="device_id" value="web-redeem-{device_seed}">
      <label for="recipient_email">Email address</label>
      <input id="recipient_email" name="recipient_email" type="email" autocomplete="email" value="{escaped_email}" required>
      <button type="submit">Activate Access</button>
    </form>
    <p class="fine">This invite works only for the email address it was sent to and can be used once.</p>
  </main>
  <script>
    const key = "cadetcatchRedeemDeviceId";
    let id = localStorage.getItem(key);
    if (!id) {{
      id = "web-redeem-" + crypto.randomUUID();
      localStorage.setItem(key, id);
    }}
    document.getElementById("device_id").value = id;
  </script>
</body>
</html>"""


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/access/status")
def access_status(
    device_id: str = Query(min_length=1, max_length=160),
    email: str | None = Query(default=None),
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    response = access_store.status(email=email)
    response["device_id"] = device_id
    return response


@app.post(
    "/access/web-auth/start",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_web_gateway)],
)
def start_web_login(
    payload: WebLoginStartRequest,
    access_store: AccessStore = Depends(store),
    mailer: InviteMailer = Depends(invite_mailer),
) -> dict[str, object]:
    try:
        challenge_id, code = access_store.create_web_login_challenge(
            email=str(payload.email),
            secret=web_auth_secret(),
        )
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    try:
        mailer.send_login_code(str(payload.email), code)
    except InviteDeliveryError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sign-in email could not be sent.",
        ) from error
    return {
        "accepted": True,
        "challenge_id": challenge_id,
        "expires_in": 600,
    }


@app.post(
    "/access/web-auth/verify",
    dependencies=[Depends(require_web_gateway)],
)
def verify_web_login(
    payload: WebLoginVerifyRequest,
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    try:
        token, session = access_store.verify_web_login_challenge(
            challenge_id=payload.challenge_id,
            email=str(payload.email),
            code=payload.code,
            secret=web_auth_secret(),
        )
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error
    return {"session_token": token, "session": session}


@app.get(
    "/access/web-session",
    dependencies=[Depends(require_web_gateway)],
)
def get_web_session(
    authorization: str | None = Header(default=None),
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    session = access_store.web_session(
        token=bearer_token(authorization),
        secret=web_auth_secret(),
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired.")
    return session


@app.post(
    "/access/web-auth/logout",
    dependencies=[Depends(require_web_gateway)],
)
def logout_web_session(
    authorization: str | None = Header(default=None),
    access_store: AccessStore = Depends(store),
) -> dict[str, bool]:
    access_store.revoke_web_session(
        token=bearer_token(authorization),
        secret=web_auth_secret(),
    )
    return {"logged_out": True}


@app.post("/access/subscription/link")
def link_subscription(
    payload: SubscriptionLinkRequest,
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    link_request = StoreKitLinkRequest(
        product_id=payload.product_id,
        transaction_id=payload.transaction_id,
        original_transaction_id=payload.original_transaction_id,
    )
    if env_bool("CADETCATCH_ALLOW_UNVERIFIED_STOREKIT"):
        verified = None
    else:
        try:
            verified = storekit_verifier().verify(link_request)
        except StoreKitConfigurationError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(error),
            ) from error
        except StoreKitVerificationError as error:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(error),
            ) from error
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Apple subscription verification failed.",
            ) from error
    expires_at = verified.expires_at if verified else None
    return access_store.grant_access(
        email=str(payload.email),
        access_type="subscriber",
        role="owner",
        desktop_add_on_active=False,
        can_invite=True,
        expires_at=expires_at,
        original_transaction_id=payload.original_transaction_id,
        product_id=payload.product_id,
        note=(
            f"Apple-verified transaction {payload.transaction_id}; device {payload.device_id}"
            if verified
            else f"Unverified staging link from device {payload.device_id}; transaction {payload.transaction_id}"
        )
    )


@app.get("/access/invitations")
def list_invitations(
    device_id: str = Query(min_length=1, max_length=160),
    email: str = Query(min_length=3, max_length=320),
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    account_status = access_store.status(email=email)
    if not account_status["active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access is not active.")
    return {
        "device_id": device_id,
        "invitations": access_store.list_invitations(owner_email=email),
    }


@app.post("/access/invitations")
def create_invitation(
    payload: InvitationRequest,
    access_store: AccessStore = Depends(store),
    mailer: InviteMailer = Depends(invite_mailer),
) -> dict[str, object]:
    invitation = None
    try:
        invitation = access_store.create_invitation(
            owner_email=str(payload.owner_email),
            role=payload.role,
            recipient_email=str(payload.recipient_email),
            public_base_url=public_base_url(),
        )
        mailer.send_invitation(invitation)
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except InviteDeliveryError as error:
        if invitation is not None:
            access_store.mark_invitation_delivery_failed(invitation_id=invitation.id)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    return {
        "sent": True,
        "delivery": "email",
        "role": invitation.role,
        "recipient_email": invitation.recipient_email,
        "invite_status": invitation.status,
        "remaining_invites": {
            "spouse_or_family": 0 if invitation.role == "spouse_or_family" else 1,
            "cadet": 0 if invitation.role == "cadet" else 1,
        },
    }


@app.post("/access/redeem-invite")
def redeem_invite(
    payload: RedeemInviteRequest,
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    try:
        status_response = access_store.redeem_invitation(
            invite_token=payload.invite_token,
            recipient_email=str(payload.recipient_email),
            device_id=payload.device_id,
        )
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    return {**status_response, "message": "Family access active."}


@app.get("/access/redeem", response_class=HTMLResponse)
def redeem_invite_page(token: str = Query(min_length=16, max_length=240)) -> HTMLResponse:
    return HTMLResponse(redeem_page_html(token=token))


@app.get("/access/desktop", response_class=HTMLResponse)
@app.get("/access/desktop/", response_class=HTMLResponse)
def desktop_page() -> HTMLResponse:
    return HTMLResponse(desktop_page_html())


@app.post("/access/redeem", response_class=HTMLResponse)
def redeem_invite_form(
    invite_token: str = Form(min_length=16, max_length=240),
    recipient_email: str = Form(min_length=3, max_length=320),
    device_id: str = Form(min_length=1, max_length=160),
    access_store: AccessStore = Depends(store),
) -> HTMLResponse:
    try:
        access_store.redeem_invitation(
            invite_token=invite_token,
            recipient_email=recipient_email,
            device_id=device_id,
        )
    except LookupError:
        return HTMLResponse(
            redeem_page_html(
                token=invite_token,
                title="Invite Not Found",
                message="Check that you opened the newest CadetCatch invite email.",
                error="This invite link was not found.",
                email=recipient_email,
            ),
            status_code=status.HTTP_404_NOT_FOUND,
        )
    except PermissionError as error:
        return HTMLResponse(
            redeem_page_html(
                token=invite_token,
                title="Invite Could Not Be Activated",
                message="Make sure you are using the same email address that received the invite.",
                error=str(error),
                email=recipient_email,
            ),
            status_code=status.HTTP_403_FORBIDDEN,
        )
    except ValueError as error:
        return HTMLResponse(
            redeem_page_html(
                token=invite_token,
                title="Check Your Email Address",
                message="Enter the email address that received this CadetCatch invite.",
                error=str(error),
                email=recipient_email,
            ),
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    return HTMLResponse(
        redeem_page_html(
            token=invite_token,
            title="Access Activated",
            message="You can now use CadetCatch with this email address.",
            status_text="Your family access is active.",
            email=recipient_email,
        )
    )


@app.post("/admin/access-grants")
def admin_access_grant(
    payload: GrantRequest,
    _: None = Depends(require_admin),
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    return access_store.grant_access(
        email=str(payload.email),
        access_type=payload.access_type,
        role=payload.role,
        desktop_add_on_active=payload.desktop_add_on_active,
        can_invite=payload.can_invite,
        expires_at=payload.expires_at,
        note=payload.note,
    )


@app.post("/admin/access-invitations")
def admin_access_invitation(
    payload: GrantRequest,
    _: None = Depends(require_admin),
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    return access_store.grant_access(
        email=str(payload.email),
        access_type=payload.access_type,
        role=payload.role,
        desktop_add_on_active=payload.desktop_add_on_active,
        can_invite=payload.can_invite,
        expires_at=payload.expires_at,
        note=payload.note,
    )
