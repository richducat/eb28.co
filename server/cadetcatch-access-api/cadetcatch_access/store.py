from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ALLOWED_INVITE_ROLES = {"spouse_or_family", "cadet"}
DEFAULT_AUTO_ADMIN_EMAILS = {
    "richard@thankyouforyourservice.co",
    "karen@thankyouforyourservice.co",
    "fishkn@upmc.edu",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def future_iso(seconds: int) -> str:
    return (
        datetime.now(timezone.utc) + timedelta(seconds=seconds)
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def past_iso(seconds: int) -> str:
    return (
        datetime.now(timezone.utc) - timedelta(seconds=seconds)
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def is_expired(expires_at: str | None) -> bool:
    if not expires_at:
        return False
    try:
        normalized = expires_at.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized) <= datetime.now(timezone.utc)
    except ValueError:
        return True


def normalize_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise ValueError("A valid email address is required.")
    return normalized


def auto_admin_emails() -> set[str]:
    configured = os.getenv("CADETCATCH_AUTO_ADMIN_EMAILS")
    if configured is None:
        return DEFAULT_AUTO_ADMIN_EMAILS
    return {
        normalize_email(email)
        for email in configured.split(",")
        if email.strip()
    }


def is_auto_admin_email(email: str) -> bool:
    return normalize_email(email) in auto_admin_emails()


def auto_admin_status(email: str) -> dict[str, Any]:
    account_email = normalize_email(email)
    return {
        "active": True,
        "access_type": "comp",
        "role": "internal_admin",
        "desktop_add_on_active": True,
        "can_invite": True,
        "expires_at": None,
        "email": account_email,
    }


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def secret_digest(secret: str, purpose: str, value: str) -> str:
    if len(secret) < 32:
        raise ValueError("Web authentication secret must be at least 32 characters.")
    return hmac.new(
        secret.encode("utf-8"),
        f"{purpose}:{value}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@dataclass(frozen=True)
class CreatedInvitation:
    id: str
    token: str
    owner_email: str
    recipient_email: str
    role: str
    status: str
    invite_url: str


class AccessStore:
    def __init__(self, database_path: str | Path):
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_db(self) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS access_accounts (
                    email TEXT PRIMARY KEY,
                    access_type TEXT NOT NULL,
                    role TEXT NOT NULL,
                    active INTEGER NOT NULL DEFAULT 1,
                    desktop_add_on_active INTEGER NOT NULL DEFAULT 0,
                    can_invite INTEGER NOT NULL DEFAULT 0,
                    expires_at TEXT,
                    original_transaction_id TEXT,
                    product_id TEXT,
                    note TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS access_invitations (
                    id TEXT PRIMARY KEY,
                    token_hash TEXT UNIQUE NOT NULL,
                    owner_email TEXT NOT NULL,
                    role TEXT NOT NULL,
                    recipient_email TEXT NOT NULL,
                    status TEXT NOT NULL,
                    redeemed_device_id TEXT,
                    redeemed_at TEXT,
                    expires_at TEXT,
                    note TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_access_invite_owner_role
                ON access_invitations(owner_email, role)
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS web_login_challenges (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    code_digest TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    expires_at TEXT NOT NULL,
                    consumed_at TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_web_login_email_created
                ON web_login_challenges(email, created_at DESC)
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS web_sessions (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    token_digest TEXT UNIQUE NOT NULL,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT,
                    created_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_web_session_email
                ON web_sessions(email, created_at DESC)
                """
            )

    def grant_access(
        self,
        *,
        email: str,
        access_type: str,
        role: str,
        desktop_add_on_active: bool = False,
        can_invite: bool = False,
        expires_at: str | None = None,
        original_transaction_id: str | None = None,
        product_id: str | None = None,
        note: str | None = None,
    ) -> dict[str, Any]:
        account_email = normalize_email(email)
        timestamp = now_iso()
        with self.connect() as conn:
            existing = conn.execute(
                "SELECT created_at FROM access_accounts WHERE email = ?",
                (account_email,),
            ).fetchone()
            created_at = existing["created_at"] if existing else timestamp
            conn.execute(
                """
                INSERT INTO access_accounts (
                    email, access_type, role, active, desktop_add_on_active,
                    can_invite, expires_at, original_transaction_id, product_id,
                    note, created_at, updated_at
                )
                VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(email) DO UPDATE SET
                    access_type = excluded.access_type,
                    role = excluded.role,
                    active = excluded.active,
                    desktop_add_on_active = excluded.desktop_add_on_active,
                    can_invite = excluded.can_invite,
                    expires_at = excluded.expires_at,
                    original_transaction_id = excluded.original_transaction_id,
                    product_id = excluded.product_id,
                    note = excluded.note,
                    updated_at = excluded.updated_at
                """,
                (
                    account_email,
                    access_type,
                    role,
                    int(desktop_add_on_active),
                    int(can_invite),
                    expires_at,
                    original_transaction_id,
                    product_id,
                    note,
                    created_at,
                    timestamp,
                ),
            )
        return self.status(email=account_email)

    def status(self, *, email: str | None) -> dict[str, Any]:
        if not email:
            return {
                "active": False,
                "access_type": "none",
                "role": "none",
                "desktop_add_on_active": False,
                "can_invite": False,
                "expires_at": None,
            }
        try:
            account_email = normalize_email(email)
        except ValueError:
            return {
                "active": False,
                "access_type": "none",
                "role": "none",
                "desktop_add_on_active": False,
                "can_invite": False,
                "expires_at": None,
            }
        if is_auto_admin_email(account_email):
            return auto_admin_status(account_email)
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM access_accounts WHERE email = ?",
                (account_email,),
            ).fetchone()
        if row is None:
            return {
                "active": False,
                "access_type": "none",
                "role": "none",
                "desktop_add_on_active": False,
                "can_invite": False,
                "expires_at": None,
            }
        active = bool(row["active"]) and not is_expired(row["expires_at"])
        return {
            "active": active,
            "access_type": row["access_type"],
            "role": row["role"],
            "desktop_add_on_active": bool(row["desktop_add_on_active"]) and active,
            "can_invite": bool(row["can_invite"]) and active,
            "expires_at": row["expires_at"],
            "email": account_email,
        }

    def web_entitlement(self, *, email: str) -> dict[str, Any]:
        account_email = normalize_email(email)
        account = self.status(email=account_email)
        is_admin = bool(account["active"]) and (
            account["access_type"] == "internal"
            or account["role"] in {"internal", "internal_admin"}
        )
        response = {
            "email": account_email,
            "active": bool(account["active"]),
            "subscriber_access": False,
            "access_type": account["access_type"],
            "role": account["role"],
            "is_admin": is_admin,
            "can_invite": bool(account["can_invite"]),
            "expires_at": account["expires_at"],
            "reason": "subscription_required",
        }
        if not account["active"]:
            response["reason"] = (
                "account_not_found"
                if account["access_type"] == "none"
                else "subscription_inactive"
            )
            return response

        if account["access_type"] == "subscriber":
            response["subscriber_access"] = True
            response["reason"] = "active_family_subscription"
            return response

        if account["access_type"] in {"comp", "complimentary", "internal"}:
            response["subscriber_access"] = True
            response["reason"] = "active_complimentary_grant"
            return response

        if account["access_type"] == "family_invite":
            with self.connect() as conn:
                invite = conn.execute(
                    """
                    SELECT owner_email
                    FROM access_invitations
                    WHERE recipient_email = ? AND status = 'redeemed'
                    ORDER BY redeemed_at DESC
                    LIMIT 1
                    """,
                    (account_email,),
                ).fetchone()
            if invite is None:
                response["active"] = False
                response["reason"] = "family_invite_not_found"
                return response
            owner = self.status(email=invite["owner_email"])
            if not owner["active"] or owner["access_type"] != "subscriber":
                response["active"] = False
                response["reason"] = "family_owner_subscription_inactive"
                return response
            response["subscriber_access"] = True
            response["reason"] = "active_family_invite"
            return response

        response["reason"] = "unsupported_access_type"
        return response

    def create_web_login_challenge(
        self,
        *,
        email: str,
        secret: str,
        ttl_seconds: int = 600,
        max_requests_per_hour: int = 5,
    ) -> tuple[str, str]:
        account_email = normalize_email(email)
        if ttl_seconds < 60 or ttl_seconds > 1800:
            raise ValueError("Login-code lifetime must be between 60 and 1800 seconds.")
        timestamp = now_iso()
        challenge_id = secrets.token_urlsafe(18)
        code = f"{secrets.randbelow(1_000_000):06d}"
        digest = secret_digest(secret, "login-code", f"{challenge_id}:{account_email}:{code}")
        with self.connect() as conn:
            recent = conn.execute(
                """
                SELECT COUNT(*) AS count
                FROM web_login_challenges
                WHERE email = ? AND created_at >= ?
                """,
                (account_email, past_iso(3600)),
            ).fetchone()["count"]
            if int(recent) >= max_requests_per_hour:
                raise PermissionError("Too many login codes requested. Try again later.")
            conn.execute(
                """
                UPDATE web_login_challenges
                SET consumed_at = ?
                WHERE email = ? AND consumed_at IS NULL
                """,
                (timestamp, account_email),
            )
            conn.execute(
                """
                INSERT INTO web_login_challenges (
                    id, email, code_digest, attempts, expires_at, consumed_at, created_at
                ) VALUES (?, ?, ?, 0, ?, NULL, ?)
                """,
                (challenge_id, account_email, digest, future_iso(ttl_seconds), timestamp),
            )
        return challenge_id, code

    def verify_web_login_challenge(
        self,
        *,
        challenge_id: str,
        email: str,
        code: str,
        secret: str,
        session_ttl_seconds: int = 2_592_000,
        max_attempts: int = 5,
    ) -> tuple[str, dict[str, Any]]:
        account_email = normalize_email(email)
        if len(code) != 6 or not code.isdigit():
            raise PermissionError("Invalid or expired login code.")
        timestamp = now_iso()
        failed = False
        raw_token = ""
        expires_at = ""
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT * FROM web_login_challenges WHERE id = ? AND email = ?",
                (challenge_id, account_email),
            ).fetchone()
            if (
                row is None
                or row["consumed_at"] is not None
                or is_expired(row["expires_at"])
                or int(row["attempts"]) >= max_attempts
            ):
                failed = True
            else:
                candidate = secret_digest(
                    secret,
                    "login-code",
                    f"{challenge_id}:{account_email}:{code}",
                )
            if not failed and not hmac.compare_digest(candidate, row["code_digest"]):
                attempts = int(row["attempts"]) + 1
                consumed_at = timestamp if attempts >= max_attempts else None
                conn.execute(
                    """
                    UPDATE web_login_challenges
                    SET attempts = ?, consumed_at = ?
                    WHERE id = ?
                    """,
                    (attempts, consumed_at, challenge_id),
                )
                failed = True

            if not failed:
                conn.execute(
                    "UPDATE web_login_challenges SET consumed_at = ? WHERE id = ?",
                    (timestamp, challenge_id),
                )
                raw_token = secrets.token_urlsafe(48)
                session_id = secrets.token_urlsafe(18)
                token_digest = secret_digest(secret, "web-session", raw_token)
                expires_at = future_iso(session_ttl_seconds)
                conn.execute(
                    """
                    INSERT INTO web_sessions (
                        id, email, token_digest, expires_at, revoked_at, created_at, last_seen_at
                    ) VALUES (?, ?, ?, ?, NULL, ?, ?)
                    """,
                    (session_id, account_email, token_digest, expires_at, timestamp, timestamp),
                )
        if failed:
            raise PermissionError("Invalid or expired login code.")
        session = self.web_entitlement(email=account_email)
        session.update({"authenticated": True, "session_expires_at": expires_at})
        return raw_token, session

    def web_session(self, *, token: str, secret: str) -> dict[str, Any] | None:
        if not token:
            return None
        digest = secret_digest(secret, "web-session", token)
        timestamp = now_iso()
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM web_sessions WHERE token_digest = ?",
                (digest,),
            ).fetchone()
            if row is None or row["revoked_at"] is not None or is_expired(row["expires_at"]):
                return None
            conn.execute(
                "UPDATE web_sessions SET last_seen_at = ? WHERE id = ?",
                (timestamp, row["id"]),
            )
        session = self.web_entitlement(email=row["email"])
        session.update({"authenticated": True, "session_expires_at": row["expires_at"]})
        return session

    def revoke_web_session(self, *, token: str, secret: str) -> bool:
        if not token:
            return False
        digest = secret_digest(secret, "web-session", token)
        with self.connect() as conn:
            result = conn.execute(
                """
                UPDATE web_sessions
                SET revoked_at = ?
                WHERE token_digest = ? AND revoked_at IS NULL
                """,
                (now_iso(), digest),
            )
        return result.rowcount > 0

    def create_invitation(
        self,
        *,
        owner_email: str,
        role: str,
        recipient_email: str,
        public_base_url: str,
        expires_at: str | None = None,
        note: str | None = None,
    ) -> CreatedInvitation:
        if role not in ALLOWED_INVITE_ROLES:
            raise ValueError("Invitation role must be spouse_or_family or cadet.")
        owner = normalize_email(owner_email)
        recipient = normalize_email(recipient_email)
        owner_status = self.status(email=owner)
        if not owner_status["active"] or owner_status["access_type"] == "none":
            raise PermissionError("Owner access is not active.")
        if is_auto_admin_email(owner):
            can_invite = True
        else:
            can_invite = False
            with self.connect() as conn:
                owner_row = conn.execute(
                    "SELECT can_invite FROM access_accounts WHERE email = ?",
                    (owner,),
                ).fetchone()
            can_invite = owner_row is not None and bool(owner_row["can_invite"])
        if not can_invite:
            raise PermissionError("Owner is not allowed to create invitations.")

        raw_token = secrets.token_urlsafe(32)
        invite_id = secrets.token_urlsafe(18)
        timestamp = now_iso()
        base_url = public_base_url.rstrip("/")
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO access_invitations (
                    id, token_hash, owner_email, role, recipient_email, status,
                    redeemed_device_id, redeemed_at, expires_at, note, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'sent', NULL, NULL, ?, ?, ?, ?)
                ON CONFLICT(owner_email, role) DO UPDATE SET
                    token_hash = excluded.token_hash,
                    recipient_email = excluded.recipient_email,
                    status = 'sent',
                    redeemed_device_id = NULL,
                    redeemed_at = NULL,
                    expires_at = excluded.expires_at,
                    note = excluded.note,
                    updated_at = excluded.updated_at
                """,
                (
                    invite_id,
                    token_hash(raw_token),
                    owner,
                    role,
                    recipient,
                    expires_at,
                    note,
                    timestamp,
                    timestamp,
                ),
            )
            row = conn.execute(
                "SELECT id, status FROM access_invitations WHERE owner_email = ? AND role = ?",
                (owner, role),
            ).fetchone()
        return CreatedInvitation(
            id=row["id"],
            token=raw_token,
            owner_email=owner,
            recipient_email=recipient,
            role=role,
            status=row["status"],
            invite_url=f"{base_url}/access/redeem?token={raw_token}",
        )

    def mark_invitation_delivery_failed(self, *, invitation_id: str) -> None:
        timestamp = now_iso()
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE access_invitations
                SET status = 'delivery_failed', updated_at = ?
                WHERE id = ? AND status = 'sent'
                """,
                (timestamp, invitation_id),
            )

    def list_invitations(self, *, owner_email: str) -> list[dict[str, Any]]:
        owner = normalize_email(owner_email)
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT role, recipient_email, status, redeemed_at, expires_at, updated_at
                FROM access_invitations
                WHERE owner_email = ?
                ORDER BY role
                """,
                (owner,),
            ).fetchall()
        return [
            {
                "role": row["role"],
                "recipient_email": row["recipient_email"],
                "status": row["status"],
                "redeemed_at": row["redeemed_at"],
                "expires_at": row["expires_at"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

    def redeem_invitation(
        self,
        *,
        invite_token: str,
        recipient_email: str,
        device_id: str | None,
    ) -> dict[str, Any]:
        recipient = normalize_email(recipient_email)
        hashed = token_hash(invite_token or "")
        timestamp = now_iso()
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM access_invitations WHERE token_hash = ?",
                (hashed,),
            ).fetchone()
            if row is None:
                raise LookupError("Invitation was not found.")
            if row["recipient_email"] != recipient:
                raise PermissionError("Invitation email does not match.")
            if row["status"] == "redeemed":
                raise PermissionError("Invitation has already been redeemed.")
            owner_status = self.status(email=row["owner_email"])
            if not owner_status["active"]:
                raise PermissionError("Owner access is not active.")
            conn.execute(
                """
                UPDATE access_invitations
                SET status = 'redeemed', redeemed_device_id = ?, redeemed_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (device_id, timestamp, timestamp, row["id"]),
            )
        return self.grant_access(
            email=recipient,
            access_type="family_invite",
            role=row["role"],
            desktop_add_on_active=False,
            can_invite=False,
            expires_at=owner_status["expires_at"],
            note=f"Redeemed invitation from {row['owner_email']}",
        )
