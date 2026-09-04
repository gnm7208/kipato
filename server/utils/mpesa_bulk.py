"""Bulk sources of M-PESA history.

A browser cannot read a phone's SMS inbox, so "import everything at once" means
handing Kipato a file. Three shapes cover what workers actually have:

* **SMS Backup & Restore XML** — the usual Android SMS export.
* **M-PESA statement CSV** — the Receipt/Completion Time/Paid In export.
* **Plain text** — a long paste, or a .txt dump of messages.

Everything funnels into `parse_mpesa_text` so one set of rules decides what
counts as income, no matter where the text came from.
"""

import csv
import io
import re
import xml.etree.ElementTree as ElementTree
from datetime import datetime
from typing import List, Optional

from server.utils.mpesa_parser import MAX_AMOUNT, parse_mpesa_text

XML = "xml"
CSV_STATEMENT = "csv"
TEXT = "text"

# Column names in the M-PESA statement export, lowercased.
_RECEIPT_COLUMNS = ("receipt no.", "receipt no", "receipt", "transaction id")
_DATE_COLUMNS = ("completion time", "date", "date & time", "completion date")
_PAID_IN_COLUMNS = ("paid in", "paid_in", "credit", "amount received")
_DETAIL_COLUMNS = ("details", "description", "narrative")


def detect_format(raw_text: str) -> str:
    head = raw_text.lstrip()[:2000]
    if head.startswith("<?xml") or "<smses" in head or "<sms " in head:
        return XML
    if _csv_header(raw_text) is not None:
        return CSV_STATEMENT
    return TEXT


def parse_bulk(raw_text: str) -> List[dict]:
    """Parse any supported bulk format into the usual parsed-entry dicts."""
    if not raw_text:
        return []

    fmt = detect_format(raw_text)
    if fmt == XML:
        return _dedupe(_parse_sms_backup_xml(raw_text))
    if fmt == CSV_STATEMENT:
        return _dedupe(_parse_statement_csv(raw_text))
    return parse_mpesa_text(raw_text)


def _dedupe(entries: List[dict]) -> List[dict]:
    seen = set()
    unique = []
    for entry in entries:
        code = entry.get("code")
        if code:
            if code in seen:
                continue
            seen.add(code)
        unique.append(entry)
    return unique


def _parse_sms_backup_xml(raw_text: str) -> List[dict]:
    try:
        root = ElementTree.fromstring(raw_text)
    except ElementTree.ParseError:
        return []

    entries: List[dict] = []
    for element in root.iter():
        if element.tag.lower() not in ("sms", "mms"):
            continue

        address = (element.get("address") or "").upper()
        body = element.get("body") or ""
        if not body:
            continue
        # Keep messages from M-PESA. An unnamed sender still gets a look, since
        # the parser itself rejects anything that is not a confirmation.
        if address and "MPESA" not in address.replace("-", "").replace(" ", ""):
            if "M-PESA" not in address:
                continue
        entries.extend(parse_mpesa_text(body))

    return entries


def _csv_header(raw_text: str) -> Optional[List[str]]:
    try:
        reader = csv.reader(io.StringIO(raw_text))
        for row in reader:
            lowered = [cell.strip().lower() for cell in row]
            has_receipt = any(cell in _RECEIPT_COLUMNS for cell in lowered)
            has_paid_in = any(cell in _PAID_IN_COLUMNS for cell in lowered)
            if has_receipt and has_paid_in:
                return lowered
            # Statements carry a few preamble rows before the real header.
            if reader.line_num > 25:
                break
    except (csv.Error, UnicodeDecodeError):
        return None
    return None


def _column_index(header: List[str], names) -> Optional[int]:
    for index, cell in enumerate(header):
        if cell in names:
            return index
    return None


def _parse_statement_csv(raw_text: str) -> List[dict]:
    header = _csv_header(raw_text)
    if header is None:
        return []

    receipt_at = _column_index(header, _RECEIPT_COLUMNS)
    date_at = _column_index(header, _DATE_COLUMNS)
    paid_in_at = _column_index(header, _PAID_IN_COLUMNS)
    detail_at = _column_index(header, _DETAIL_COLUMNS)
    if paid_in_at is None:
        return []

    entries: List[dict] = []
    reached_header = False
    for row in csv.reader(io.StringIO(raw_text)):
        lowered = [cell.strip().lower() for cell in row]
        if not reached_header:
            reached_header = lowered == header
            continue
        if len(row) <= paid_in_at:
            continue

        amount = _to_amount(row[paid_in_at])
        if amount is None:
            # No money in on this row: it is a payment, withdrawal or a total.
            continue

        entry_date = _to_date(row[date_at]) if date_at is not None and len(row) > date_at else None
        if entry_date is None:
            continue

        code = row[receipt_at].strip().upper() if receipt_at is not None and len(row) > receipt_at else None
        details = row[detail_at].strip() if detail_at is not None and len(row) > detail_at else ""

        entries.append({
            "code": code or None,
            "amount": amount,
            "date": entry_date,
            "sender": _sender_from_details(details),
            "raw": (", ".join(cell.strip() for cell in row))[:500],
        })

    return entries


def _to_amount(value: str) -> Optional[float]:
    cleaned = (value or "").replace(",", "").replace("Ksh", "").replace("KES", "").strip()
    if not cleaned:
        return None
    try:
        amount = float(cleaned)
    except ValueError:
        return None
    if amount <= 0 or amount > MAX_AMOUNT:
        return None
    return amount


_STATEMENT_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %b %Y",
)


def _to_date(value: str):
    cleaned = (value or "").strip()
    if not cleaned:
        return None
    for fmt in _STATEMENT_DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _sender_from_details(details: str) -> Optional[str]:
    if not details:
        return None
    # "Funds received from JOHN DOE 254712345678" / "Pay Bill from ..."
    match = re.search(r"from\s+([A-Za-z][A-Za-z.'\- ]{1,60})", details, re.IGNORECASE)
    if match:
        return " ".join(match.group(1).split()).strip(" .,-")[:120] or None
    return details[:120]
