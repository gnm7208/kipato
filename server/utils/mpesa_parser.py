"""Parser for pasted M-PESA confirmation messages.

Safaricom sends one SMS per transaction, and workers paste one or many of them
into Kipato at once. Only *inbound* money is treated as income: a message about
money the worker sent, paid or withdrew must never become an income entry.

The parser is deliberately tolerant of the wording variants Safaricom uses
("You have received Ksh500.00 from ..." and "Ksh500.00 received from ...") and
still accepts the simple ``YYYY-MM-DD ... 1000.00`` shorthand so hand-typed
records keep working.

`server/utils/mpesa_parser.py` and `frontend/src/lib/mpesa-parser.ts` implement
the same rules; change them together.
"""

import re
from datetime import date, datetime
from typing import List, Optional

# A Safaricom transaction code: 10 alphanumerics, e.g. "RJ12ABC123".
TXN_CODE = r"[A-Z0-9]{10}"

_CODE_RE = re.compile(r"\b(" + TXN_CODE + r")\b(?=\s+Confirmed)", re.IGNORECASE)
_SPLIT_RE = re.compile(r"(?=\b" + TXN_CODE + r"\b\s+Confirmed)", re.IGNORECASE)

_AMOUNT = r"(?:Ksh|KES|Kshs)\s*\.?\s*(\d[\d,]*(?:\.\d{1,2})?)"
# "received Ksh500.00" and "Ksh500.00 received" are both in the wild.
_RECEIVED_THEN_AMOUNT_RE = re.compile(r"receiv(?:ed|e)\s+" + _AMOUNT, re.IGNORECASE)
_AMOUNT_THEN_RECEIVED_RE = re.compile(_AMOUNT + r"\s+receiv(?:ed|e)\b", re.IGNORECASE)

# Money leaving the worker's wallet. Never income.
_OUTBOUND_RE = re.compile(
    r"\b(sent to|paid to|pay bill to|withdraw|bought|buy goods to|"
    r"transferred to|airtime)\b",
    re.IGNORECASE,
)
_INBOUND_RE = re.compile(r"\breceiv(?:ed|e)\b", re.IGNORECASE)

_DMY_RE = re.compile(r"\bon\s+(\d{1,2})/(\d{1,2})/(\d{2,4})\b", re.IGNORECASE)
_ISO_RE = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")

_SENDER_RE = re.compile(
    r"\bfrom\s+([A-Za-z][A-Za-z.'\- ]{1,60}?)"
    r"(?=\s+(?:\+?254\d{9}|0\d{9}|\d{10,12})\b|\s+on\b|\s*[.,]|$)",
    re.IGNORECASE,
)

# Fallback for hand-typed lines: "2026-09-01 Received 1000.00 from ...".
_PLAIN_RE = re.compile(r"(?P<date>\d{4}-\d{2}-\d{2}).*?(?P<amount>\d[\d,]*\.\d{2})")

MAX_AMOUNT = 1000000


def _to_amount(raw: str) -> Optional[float]:
    try:
        value = float(raw.replace(",", ""))
    except (TypeError, ValueError):
        return None
    if value <= 0 or value > MAX_AMOUNT:
        return None
    return value


def _to_date(day: int, month: int, year: int) -> Optional[date]:
    if year < 100:
        year += 2000
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _find_date(segment: str) -> Optional[date]:
    match = _DMY_RE.search(segment)
    if match:
        # Safaricom formats Kenyan dates as day/month/year.
        parsed = _to_date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        if parsed:
            return parsed
    match = _ISO_RE.search(segment)
    if match:
        return _to_date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    return None


def _find_amount(segment: str) -> Optional[float]:
    # Anchor on the "received" keyword so the closing balance is never mistaken
    # for the transaction amount.
    for pattern in (_RECEIVED_THEN_AMOUNT_RE, _AMOUNT_THEN_RECEIVED_RE):
        match = pattern.search(segment)
        if match:
            amount = _to_amount(match.group(1))
            if amount is not None:
                return amount
    return None


def _find_sender(segment: str) -> Optional[str]:
    match = _SENDER_RE.search(segment)
    if not match:
        return None
    sender = " ".join(match.group(1).split()).strip(" .,-")
    return sender[:120] or None


def _split_messages(raw_text: str) -> List[str]:
    segments: List[str] = []
    for block in re.split(r"[\r\n]+", raw_text):
        block = block.strip()
        if not block:
            continue
        # Several SMS pasted onto one line still split on their transaction code.
        for part in _SPLIT_RE.split(block):
            part = " ".join(part.split())
            if part:
                segments.append(part)
    return segments


def parse_mpesa_text(raw_text: str) -> List[dict]:
    """Extract inbound transactions from pasted M-PESA text.

    Returns a list of ``{"code", "amount", "date", "sender", "raw"}`` dicts,
    ordered as they appear in the text and de-duplicated by transaction code.
    """
    if not raw_text:
        return []

    entries: List[dict] = []
    seen_codes = set()

    for segment in _split_messages(raw_text):
        if _OUTBOUND_RE.search(segment) and not _INBOUND_RE.search(segment):
            continue

        amount = _find_amount(segment)
        if amount is None and _OUTBOUND_RE.search(segment):
            # An outbound message that merely mentions "received" elsewhere.
            continue

        entry_date = _find_date(segment)

        if amount is None or entry_date is None:
            match = _PLAIN_RE.search(segment)
            if not match:
                continue
            amount = _to_amount(match.group("amount"))
            entry_date = _find_date(match.group("date"))
            if amount is None or entry_date is None:
                continue

        code_match = _CODE_RE.search(segment)
        code = code_match.group(1).upper() if code_match else None
        if code and code in seen_codes:
            continue
        if code:
            seen_codes.add(code)

        entries.append({
            "code": code,
            "amount": amount,
            "date": entry_date,
            "sender": _find_sender(segment),
            "raw": segment[:500],
        })

    return entries


def parse_iso_date(value: str) -> Optional[date]:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None
