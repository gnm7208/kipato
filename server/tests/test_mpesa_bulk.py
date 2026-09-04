from datetime import date

from server.utils.mpesa_bulk import CSV_STATEMENT, TEXT, XML, detect_format, parse_bulk

SMS_BACKUP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<smses count="4">
  <sms address="MPESA" date="1756900000000" type="1" body="RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 on 3/9/26 at 10:15 AM New M-PESA balance is Ksh1,234.00." />
  <sms address="MPESA" date="1756900001000" type="1" body="TFG5H6J7K8 Confirmed. Ksh300.00 sent to NAIVAS on 3/9/26 at 11:00 AM" />
  <sms address="Safaricom" date="1756900002000" type="1" body="Your data bundle expires soon" />
  <sms address="M-PESA" date="1756900003000" type="1" body="QQ11WW22EE Confirmed. Ksh2,000.00 received from JANE W 254700000000 on 1/9/26 at 9:00 AM" />
</smses>"""

STATEMENT_CSV = """M-PESA Statement
Customer Name: DEMO WORKER

Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance
RJ12ABC123,2026-09-03 10:15:00,Funds received from JOHN DOE 254712345678,Completed,500.00,,1234.00
TFG5H6J7K8,2026-09-03 11:00:00,Pay Bill to NAIVAS,Completed,,300.00,934.00
QQ11WW22EE,2026-09-01 09:00:00,Funds received from JANE W,Completed,"2,000.00",,2934.00
"""


def test_detects_each_format():
    assert detect_format(SMS_BACKUP_XML) == XML
    assert detect_format(STATEMENT_CSV) == CSV_STATEMENT
    assert detect_format("RJ12ABC123 Confirmed. You have received Ksh1.00 on 1/9/26") == TEXT


def test_sms_backup_xml_keeps_only_incoming_mpesa():
    entries = parse_bulk(SMS_BACKUP_XML)

    assert [e["code"] for e in entries] == ["RJ12ABC123", "QQ11WW22EE"]
    assert entries[0]["amount"] == 500.00
    assert entries[0]["date"] == date(2026, 9, 3)
    assert entries[1]["amount"] == 2000.00


def test_statement_csv_uses_the_paid_in_column():
    entries = parse_bulk(STATEMENT_CSV)

    assert [e["code"] for e in entries] == ["RJ12ABC123", "QQ11WW22EE"]
    assert entries[0]["amount"] == 500.00
    assert entries[0]["sender"] == "JOHN DOE"
    assert entries[1]["amount"] == 2000.00, "thousands separators inside quotes"


def test_statement_csv_ignores_withdrawals():
    assert all(e["code"] != "TFG5H6J7K8" for e in parse_bulk(STATEMENT_CSV))


def test_bulk_de_duplicates_repeated_codes():
    doubled = SMS_BACKUP_XML.replace("</smses>", "") + """
  <sms address="MPESA" date="1756900004000" type="1" body="RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE on 3/9/26 at 10:15 AM" />
</smses>"""
    assert len(parse_bulk(doubled)) == 2


def test_malformed_input_yields_nothing():
    assert parse_bulk("<smses><sms body='unclosed") == []
    assert parse_bulk("") == []


def test_plain_text_still_falls_through_to_the_sms_parser():
    entries = parse_bulk(
        "RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE on 3/9/26 at 10:15 AM"
    )
    assert len(entries) == 1
    assert entries[0]["amount"] == 500.00
