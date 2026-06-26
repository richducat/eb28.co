from __future__ import annotations

import os
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .store import AccessStore


def env_bool(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def database_path() -> Path:
    return Path(os.getenv("CADETCATCH_ACCESS_DB", "/tmp/cadetcatch-access.sqlite3"))


def public_base_url() -> str:
    return os.getenv("CADETCATCH_PUBLIC_BASE_URL", "https://api.cadetcatch.com")


def build_store() -> AccessStore:
    return AccessStore(database_path())


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


def store() -> AccessStore:
    return build_store()


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


@app.post("/access/subscription/link")
def link_subscription(
    payload: SubscriptionLinkRequest,
    access_store: AccessStore = Depends(store),
) -> dict[str, object]:
    if not env_bool("CADETCATCH_ALLOW_UNVERIFIED_STOREKIT"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Server-side Apple subscription verification is not configured.",
        )
    return access_store.grant_access(
        email=str(payload.email),
        access_type="subscriber",
        role="owner",
        desktop_add_on_active=False,
        can_invite=True,
        original_transaction_id=payload.original_transaction_id,
        product_id=payload.product_id,
        note=f"Linked from device {payload.device_id}; transaction {payload.transaction_id}",
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
) -> dict[str, object]:
    try:
        invitation = access_store.create_invitation(
            owner_email=str(payload.owner_email),
            role=payload.role,
            recipient_email=str(payload.recipient_email),
            public_base_url=public_base_url(),
        )
    except PermissionError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    return {
        "sent": True,
        "role": invitation.role,
        "recipient_email": invitation.recipient_email,
        "invite_status": invitation.status,
        "invite_url": invitation.invite_url,
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
