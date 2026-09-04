from datetime import date

from server.utils.mpesa_parser import parse_mpesa_text

RECEIVED = (
    "RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 "
    "on 3/9/26 at 10:15 AM New M-PESA balance is Ksh1,234.00."
)
RECEIVED_ALT = (
    "SFH8ABC1D2 Confirmed. Ksh1,500.00 received from JANE WANJIKU 254700000000 "
    "on 12/8/26 at 4:05 PM"
)
SENT = (
    "TFG5H6J7K8 Confirmed. Ksh300.00 sent to NAIVAS LTD on 3/9/26 at 11:00 AM. "
    "New M-PESA balance is Ksh700.00"
)
PAID = "AB12CD34EF Confirmed. Ksh450.00 paid to KPLC PREPAID on 2/9/26 at 8:00 AM"
WITHDRAWN = "ZZ99YY88XX Confirmed. Withdraw Ksh1,000.00 from AGENT 123456 on 2/9/26 at 1:00 PM"


def test_parses_standard_received_message():
    entries = parse_mpesa_text(RECEIVED)
    assert len(entries) == 1
    entry = entries[0]
    assert entry["code"] == "RJ12ABC123"
    assert entry["amount"] == 500.00
    assert entry["date"] == date(2026, 9, 3)
    assert entry["sender"] == "JOHN DOE"


def test_ignores_closing_balance_when_reading_amount():
    # The balance (Ksh1,234.00) is larger and appears later; it must not win.
    assert parse_mpesa_text(RECEIVED)[0]["amount"] == 500.00


def test_parses_alternate_received_wording():
    entry = parse_mpesa_text(RECEIVED_ALT)[0]
    assert entry["amount"] == 1500.00
    assert entry["date"] == date(2026, 8, 12), "Kenyan dates are day/month/year"
    assert entry["sender"] == "JANE WANJIKU"


def test_outgoing_money_is_never_income():
    for message in (SENT, PAID, WITHDRAWN):
        assert parse_mpesa_text(message) == [], message


def test_mixed_paste_keeps_only_incoming():
    entries = parse_mpesa_text("\n".join([RECEIVED, SENT, RECEIVED_ALT, PAID]))
    assert [e["code"] for e in entries] == ["RJ12ABC123", "SFH8ABC1D2"]


def test_duplicate_transaction_codes_are_collapsed():
    assert len(parse_mpesa_text("\n".join([RECEIVED, RECEIVED]))) == 1


def test_multiple_messages_on_one_line_are_split():
    entries = parse_mpesa_text(RECEIVED + " " + RECEIVED_ALT)
    assert len(entries) == 2


def test_plain_shorthand_still_parses():
    entries = parse_mpesa_text("2026-09-01 Received 1000.00 from 254700000001")
    assert len(entries) == 1
    assert entries[0]["amount"] == 1000.00
    assert entries[0]["date"] == date(2026, 9, 1)
    assert entries[0]["code"] is None


def test_thousands_separator_and_no_decimals():
    entry = parse_mpesa_text(
        "QQ11WW22EE Confirmed. You have received Ksh12,000 from PETER K on 1/9/26 at 9:00 AM"
    )[0]
    assert entry["amount"] == 12000.00


def test_rejects_junk_and_empty_input():
    assert parse_mpesa_text("") == []
    assert parse_mpesa_text("hello there, no money here") == []


def test_rejects_impossible_date():
    assert parse_mpesa_text(
        "QQ11WW22EE Confirmed. You have received Ksh100.00 from X on 45/13/26 at 9:00 AM"
    ) == []
