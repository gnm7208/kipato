

def test_import_mpesa(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    raw_text = (
        "2026-09-01 Received 1000.00 from 254700000001\n"
        "2026-09-02 Received 2000.00 from 254700000001\n"
    )
    response = client.post("/api/mpesa/imports", json={
        "source_ref": "import-001",
        "raw_text": raw_text,
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["entries_count"] == 2


def test_list_imports(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    response = client.get("/api/mpesa/imports")
    assert response.status_code == 200
    assert response.get_json()["imports"] == []


def _register(client):
    return client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })


RECEIVED = (
    "RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 "
    "on 3/9/26 at 10:15 AM New M-PESA balance is Ksh1,234.00."
)
SENT = "TFG5H6J7K8 Confirmed. Ksh300.00 sent to NAIVAS LTD on 3/9/26 at 11:00 AM"


def test_import_real_mpesa_sms_skips_outgoing(client):
    _register(client)
    response = client.post("/api/mpesa/imports", json={
        "source_ref": "sms-paste",
        "raw_text": "{}\n{}".format(RECEIVED, SENT),
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["created_count"] == 1
    assert data["parsed_count"] == 1

    entries = client.get("/api/income/entries").get_json()["entries"]
    assert len(entries) == 1
    assert entries[0]["amount"] == 500.00
    assert entries[0]["method"] == "mpesa"


def test_reimporting_same_sms_creates_no_duplicates(client):
    _register(client)
    payload = {"source_ref": "sms-paste", "raw_text": RECEIVED}
    client.post("/api/mpesa/imports", json=payload)
    response = client.post("/api/mpesa/imports", json=dict(payload, source_ref="again"))

    assert response.status_code == 201
    data = response.get_json()
    assert data["created_count"] == 0
    assert data["duplicate_count"] == 1
    assert client.get("/api/income/entries").get_json()["total"] == 1


def test_preview_parses_without_saving(client):
    _register(client)
    response = client.post("/api/mpesa/imports/preview", json={"raw_text": RECEIVED})

    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] == 1
    assert data["entries"][0]["code"] == "RJ12ABC123"
    assert client.get("/api/income/entries").get_json()["total"] == 0


def test_import_requires_source_ref(client):
    _register(client)
    response = client.post("/api/mpesa/imports", json={"raw_text": RECEIVED})
    assert response.status_code == 400


def test_import_requires_authentication(client):
    response = client.post("/api/mpesa/imports", json={
        "source_ref": "x", "raw_text": RECEIVED,
    })
    assert response.status_code == 401


SMS_BACKUP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<smses count="3">
  <sms address="MPESA" type="1" body="RJ12ABC123 Confirmed. You have received Ksh500.00 from JOHN DOE 254712345678 on 3/9/26 at 10:15 AM" />
  <sms address="MPESA" type="1" body="TFG5H6J7K8 Confirmed. Ksh300.00 sent to NAIVAS on 3/9/26 at 11:00 AM" />
  <sms address="MPESA" type="1" body="QQ11WW22EE Confirmed. Ksh2,000.00 received from JANE W on 1/9/26 at 9:00 AM" />
</smses>"""


def test_imports_a_whole_sms_backup_at_once(client):
    _register(client)
    response = client.post("/api/mpesa/imports", json={
        "source_ref": "phone backup",
        "raw_text": SMS_BACKUP_XML,
    })

    assert response.status_code == 201
    data = response.get_json()
    assert data["format"] == "xml"
    assert data["created_count"] == 2, "the outgoing payment is not income"
    assert client.get("/api/income/entries").get_json()["total"] == 2


def test_reimporting_the_same_backup_adds_nothing(client):
    _register(client)
    payload = {"source_ref": "phone backup", "raw_text": SMS_BACKUP_XML}
    client.post("/api/mpesa/imports", json=payload)
    response = client.post("/api/mpesa/imports", json=dict(payload, source_ref="again"))

    assert response.get_json()["created_count"] == 0
    assert response.get_json()["duplicate_count"] == 2
    assert client.get("/api/income/entries").get_json()["total"] == 2


def test_preview_reports_the_detected_format(client):
    _register(client)
    response = client.post("/api/mpesa/imports/preview", json={"raw_text": SMS_BACKUP_XML})

    data = response.get_json()
    assert data["format"] == "xml"
    assert data["count"] == 2
    assert data["truncated"] is False


def test_import_rejects_an_oversized_payload(client):
    _register(client)
    response = client.post("/api/mpesa/imports", json={
        "source_ref": "huge", "raw_text": "x" * 8_000_001,
    })
    assert response.status_code == 400


def test_large_backup_imports_in_one_request(client):
    _register(client)
    messages = "\n".join(
        '  <sms address="MPESA" type="1" body="{:0>10} Confirmed. You have received '
        'Ksh{}.00 from SENDER {} on 3/9/26 at 10:15 AM" />'.format(
            "A{}".format(index).upper().replace("-", ""), 100 + index, index
        )
        for index in range(600)
    )
    backup = '<?xml version="1.0" encoding="UTF-8"?>\n<smses>\n{}\n</smses>'.format(messages)

    response = client.post("/api/mpesa/imports", json={
        "source_ref": "year of messages", "raw_text": backup,
    })

    assert response.status_code == 201
    assert response.get_json()["created_count"] == 600
    assert client.get("/api/income/entries").get_json()["total"] == 600
