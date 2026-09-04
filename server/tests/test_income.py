

def test_create_entry(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    response = client.post("/api/income/entries", json={
        "amount": 1500.50,
        "date": "2026-09-01",
        "method": "cash",
        "note": "Day earnings",
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["amount"] == 1500.50
    assert data["method"] == "cash"
    assert data["sync_status"] == "synced"


def test_list_entries(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    client.post("/api/income/entries", json={
        "amount": 1000,
        "date": "2026-09-01",
        "method": "cash",
    })
    response = client.get("/api/income/entries")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 1


def test_trends(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    client.post("/api/income/entries", json={
        "amount": 1000,
        "date": "2026-09-01",
        "method": "cash",
    })
    client.post("/api/income/entries", json={
        "amount": 2000,
        "date": "2026-09-02",
        "method": "mpesa",
    })
    response = client.get("/api/income/trends")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total_income"] == 3000
    assert data["entry_count"] == 2


def test_entry_unauthorized(client):
    response = client.post("/api/income/entries", json={
        "amount": 1000,
        "date": "2026-09-01",
    })
    assert response.status_code == 401


def _register_worker(client):
    return client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })


def test_replaying_a_queued_entry_does_not_duplicate(client):
    _register_worker(client)
    payload = {
        "amount": 900,
        "date": "2026-09-04",
        "method": "cash",
        "note": "Logged with no signal",
        "client_uuid": "offline-abc-123",
    }

    first = client.post("/api/income/entries", json=payload)
    assert first.status_code == 201

    # The sync engine may replay the same queued entry after a flaky connection.
    replay = client.post("/api/income/entries", json=payload)
    assert replay.status_code == 200
    assert replay.get_json()["id"] == first.get_json()["id"]

    assert client.get("/api/income/entries").get_json()["total"] == 1


def test_distinct_client_uuids_create_distinct_entries(client):
    _register_worker(client)
    base = {"amount": 100, "date": "2026-09-04", "method": "cash"}
    client.post("/api/income/entries", json=dict(base, client_uuid="one"))
    client.post("/api/income/entries", json=dict(base, client_uuid="two"))

    assert client.get("/api/income/entries").get_json()["total"] == 2


def test_rejects_malformed_client_uuid(client):
    _register_worker(client)
    response = client.post("/api/income/entries", json={
        "amount": 100,
        "date": "2026-09-04",
        "method": "cash",
        "client_uuid": "not a valid uuid!",
    })
    assert response.status_code == 400


def test_created_entry_records_when_it_synced(client):
    _register_worker(client)
    response = client.post("/api/income/entries", json={
        "amount": 100, "date": "2026-09-04", "method": "cash",
    })
    data = response.get_json()
    assert data["sync_status"] == "synced"
    assert data["synced_at"] is not None


def test_one_workers_entries_are_invisible_to_another(client):
    _register_worker(client)
    client.post("/api/income/entries", json={
        "amount": 100, "date": "2026-09-04", "method": "cash",
    })
    client.post("/api/auth/logout")

    client.post("/api/auth/register", json={
        "phone": "+254700000009",
        "full_name": "Other Worker",
        "password": "securepassword123",
    })
    assert client.get("/api/income/entries").get_json()["total"] == 0
