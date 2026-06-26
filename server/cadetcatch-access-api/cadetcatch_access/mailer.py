from __future__ import annotations

import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

from .store import CreatedInvitation


class InviteDeliveryError(RuntimeError):
    pass


def env_bool(name: str, *, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class InviteMailer:
    mode: str
    from_email: str
    from_name: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    use_tls: bool
    use_ssl: bool

    @classmethod
    def from_env(cls) -> "InviteMailer":
        return cls(
            mode=os.getenv("CADETCATCH_INVITE_EMAIL_MODE", "disabled").strip().lower(),
            from_email=os.getenv("CADETCATCH_INVITE_FROM_EMAIL", "").strip(),
            from_name=os.getenv("CADETCATCH_INVITE_FROM_NAME", "CadetCatch").strip(),
            smtp_host=os.getenv("CADETCATCH_SMTP_HOST", "").strip(),
            smtp_port=int(os.getenv("CADETCATCH_SMTP_PORT", "587")),
            smtp_username=os.getenv("CADETCATCH_SMTP_USERNAME", "").strip(),
            smtp_password=os.getenv("CADETCATCH_SMTP_PASSWORD", ""),
            use_tls=env_bool("CADETCATCH_SMTP_USE_TLS", default=True),
            use_ssl=env_bool("CADETCATCH_SMTP_USE_SSL", default=False),
        )

    def send_invitation(self, invitation: CreatedInvitation) -> None:
        if self.mode == "console":
            print(build_invitation_message(invitation, self.from_email or "support@eb28.co", self.from_name))
            return
        if self.mode != "smtp":
            raise InviteDeliveryError("Invitation email delivery is not configured.")
        self._send_smtp(invitation)

    def _send_smtp(self, invitation: CreatedInvitation) -> None:
        if not self.from_email:
            raise InviteDeliveryError("CADETCATCH_INVITE_FROM_EMAIL is required for SMTP invites.")
        if not self.smtp_host:
            raise InviteDeliveryError("CADETCATCH_SMTP_HOST is required for SMTP invites.")

        message = build_invitation_message(invitation, self.from_email, self.from_name)
        try:
            if self.use_ssl:
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=ssl.create_default_context()) as smtp:
                    self._login_if_configured(smtp)
                    smtp.send_message(message)
            else:
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=20) as smtp:
                    if self.use_tls:
                        smtp.starttls(context=ssl.create_default_context())
                    self._login_if_configured(smtp)
                    smtp.send_message(message)
        except Exception as error:
            raise InviteDeliveryError("Invitation email could not be sent.") from error

    def _login_if_configured(self, smtp: smtplib.SMTP) -> None:
        if self.smtp_username or self.smtp_password:
            smtp.login(self.smtp_username, self.smtp_password)


def role_label(role: str) -> str:
    if role == "cadet":
        return "cadet"
    return "spouse or family member"


def build_invitation_message(invitation: CreatedInvitation, from_email: str, from_name: str) -> EmailMessage:
    label = role_label(invitation.role)
    body = (
        f"You have been invited to use CadetCatch as a {label}.\n\n"
        "Open this secure link and sign in with the same email address that received this message:\n\n"
        f"{invitation.invite_url}\n\n"
        "This invite is tied to your email address and can only be redeemed once. "
        "Do not forward it to someone else.\n\n"
        "CadetCatch"
    )

    message = EmailMessage()
    message["Subject"] = "Your CadetCatch access invite"
    message["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    message["To"] = invitation.recipient_email
    message.set_content(body)
    return message
