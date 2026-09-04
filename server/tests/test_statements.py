

def test_create_statement(client):
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
        "date": "2026-09-15",
        "method": "mpesa",
    })
    response = client.post("/api/statements/", json={
        "start_date": "2026-09-01",
        "end_date": "2026-09-30",
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["total_income"] == 3000
    assert data["entry_count"] == 2


def test_list_statements(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    response = client.get("/api/statements/")
    assert response.status_code == 200
    assert response.get_json()["statements"] == []
