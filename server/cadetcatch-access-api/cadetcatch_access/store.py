from __future__ import annotations

import hashlib
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_INVITE_ROLES = {"spouse_or_family", "cadet"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_email(email: str) -> str:
    normalized = (email or "").strip().lower()
    if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
        raise ValueError("A valid email address is required.")
    return normalized


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


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
                "expires_at": None,
            }
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
                "expires_at": None,
            }
        return {
            "active": bool(row["active"]),
            "access_type": row["access_type"],
            "role": row["role"],
            "desktop_add_on_active": bool(row["desktop_add_on_active"]),
            "expires_at": row["expires_at"],
            "email": account_email,
        }

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
        with self.connect() as conn:
            owner_row = conn.execute(
                "SELECT can_invite FROM access_accounts WHERE email = ?",
                (owner,),
            ).fetchone()
        if owner_row is None or not bool(owner_row["can_invite"]):
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
