import re
from typing import Optional


def validate_phone(phone: str) -> Optional[str]:
    if not phone:
        return "phone is required"
    if not re.match(r"^\+?[1-9]\d{1,14}$", phone):
        return "phone must be a valid E.164 number"
    return None


def validate_password(password: str) -> Optional[str]:
    if not password:
        return "password is required"
    if len(password) < 8:
        return "password must be at least 8 characters"
    return None


def validate_amount(amount) -> Optional[str]:
    if amount is None:
        return "amount is required"
    try:
        value = float(amount)
        if value <= 0:
            return "amount must be greater than 0"
        if value > 1000000:
            return "amount exceeds maximum allowed"
    except (TypeError, ValueError):
        return "amount must be a valid number"
    return None


def validate_date(date_str) -> Optional[str]:
    if not date_str:
        return "date is required"
    try:
        from datetime import datetime
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return "date must be YYYY-MM-DD"
    return None


def validate_note(note: str) -> Optional[str]:
    if note and len(note) > 255:
        return "note must be 255 characters or fewer"
    return None


def validate_client_uuid(client_uuid) -> Optional[str]:
    if client_uuid is None:
        return None
    if not isinstance(client_uuid, str):
        return "client_uuid must be a string"
    if len(client_uuid) > 64:
        return "client_uuid must be 64 characters or fewer"
    if not re.match(r"^[A-Za-z0-9:_-]+$", client_uuid):
        return "client_uuid may only contain letters, digits, ':', '_' and '-'"
    return None


def validate_email(email) -> Optional[str]:
    if not email:
        return "email is required"
    if not isinstance(email, str) or len(email) > 120:
        return "email must be 120 characters or fewer"
    if not re.match(r"^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$", email):
        return "email must be a valid address"
    return None


def validate_full_name(full_name) -> Optional[str]:
    if not full_name or not full_name.strip():
        return "full_name is required"
    if len(full_name) > 120:
        return "full_name must be 120 characters or fewer"
    return None
