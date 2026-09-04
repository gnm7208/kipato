"""Minimal SMTP sender.

When SMTP is not configured (local development, CI) the message is logged
instead of sent, so verification flows stay usable without a mail server.
"""

import logging
import smtplib
from email.message import EmailMessage

from server.config import Config

logger = logging.getLogger(__name__)


def email_is_configured() -> bool:
    """Whether this deployment can actually deliver mail."""
    return bool(Config.SMTP_HOST)


def send_email(to_address: str, subject: str, body: str) -> bool:
    """Send an email. Returns True when it was handed to an SMTP server."""
    if not to_address:
        return False

    if not Config.SMTP_HOST:
        logger.info("SMTP not configured; email to %s not sent. Subject: %s\n%s",
                    to_address, subject, body)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = Config.FROM_EMAIL or Config.SMTP_USER
    message["To"] = to_address
    message.set_content(body)

    try:
        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            if Config.SMTP_USER and Config.SMTP_PASSWORD:
                smtp.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except (smtplib.SMTPException, OSError):
        logger.exception("Failed to send email to %s", to_address)
        return False
