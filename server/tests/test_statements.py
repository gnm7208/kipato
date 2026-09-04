

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


def _worker_with_statement(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    client.post("/api/income/entries", json={
        "amount": 1200, "date": "2026-09-02", "method": "cash", "note": "Day work",
    })
    response = client.post("/api/statements/", json={
        "start_date": "2026-09-01", "end_date": "2026-09-30",
    })
    return response.get_json()["id"]


def test_statements_are_private_until_shared(client):
    _worker_with_statement(client)
    listed = client.get("/api/statements/").get_json()["statements"][0]

    assert listed["share_active"] is False
    assert listed["share_token"] is None


def test_sharing_produces_a_link_a_lender_can_open(client):
    statement_id = _worker_with_statement(client)

    response = client.post("/api/statements/{}/share".format(statement_id), json={})
    assert response.status_code == 200
    token = response.get_json()["statement"]["share_token"]
    assert response.get_json()["share_path"] == "/s/{}".format(token)

    # A lender has no session at all.
    client.post("/api/auth/logout")
    public = client.get("/api/statements/shared/{}".format(token))

    assert public.status_code == 200
    data = public.get_json()
    assert data["statement"]["total_income"] == 1200.0
    assert data["worker"]["full_name"] == "Test Worker"
    assert len(data["entries"]) == 1
    assert data["entries"][0]["amount"] == 1200.0


def test_shared_view_exposes_nothing_but_the_proof(client):
    statement_id = _worker_with_statement(client)
    token = client.post(
        "/api/statements/{}/share".format(statement_id), json={}
    ).get_json()["statement"]["share_token"]
    client.post("/api/auth/logout")

    data = client.get("/api/statements/shared/{}".format(token)).get_json()

    assert set(data["worker"]) == {"full_name", "phone", "member_since"}
    assert "password_hash" not in str(data)
    assert "id" not in data["statement"], "an internal id invites enumeration"


def test_revoking_a_share_kills_the_link(client):
    statement_id = _worker_with_statement(client)
    token = client.post(
        "/api/statements/{}/share".format(statement_id), json={}
    ).get_json()["statement"]["share_token"]

    revoked = client.delete("/api/statements/{}/share".format(statement_id))
    assert revoked.status_code == 200
    assert revoked.get_json()["statement"]["share_active"] is False

    client.post("/api/auth/logout")
    assert client.get("/api/statements/shared/{}".format(token)).status_code == 404


def test_resharing_rotates_the_token_so_old_links_die(client):
    statement_id = _worker_with_statement(client)
    first = client.post(
        "/api/statements/{}/share".format(statement_id), json={}
    ).get_json()["statement"]["share_token"]
    second = client.post(
        "/api/statements/{}/share".format(statement_id), json={}
    ).get_json()["statement"]["share_token"]

    assert first != second
    client.post("/api/auth/logout")
    assert client.get("/api/statements/shared/{}".format(first)).status_code == 404
    assert client.get("/api/statements/shared/{}".format(second)).status_code == 200


def test_expired_link_says_so_rather_than_pretending_it_never_existed(client, app):
    from datetime import timedelta

    from server.extensions import db
    from server.models import Statement
    from server.utils.timeutils import now_utc

    statement_id = _worker_with_statement(client)
    token = client.post(
        "/api/statements/{}/share".format(statement_id), json={}
    ).get_json()["statement"]["share_token"]

    statement = db.session.get(Statement, statement_id)
    statement.share_expires_at = now_utc() - timedelta(days=1)
    db.session.commit()

    client.post("/api/auth/logout")
    response = client.get("/api/statements/shared/{}".format(token))

    assert response.status_code == 410
    assert "expired" in response.get_json()["error"].lower()


def test_share_window_is_bounded(client):
    statement_id = _worker_with_statement(client)

    assert client.post(
        "/api/statements/{}/share".format(statement_id), json={"expires_in_days": 0}
    ).status_code == 400
    assert client.post(
        "/api/statements/{}/share".format(statement_id), json={"expires_in_days": 9999}
    ).status_code == 400
    assert client.post(
        "/api/statements/{}/share".format(statement_id), json={"expires_in_days": 7}
    ).status_code == 200


def test_a_worker_cannot_share_someone_elses_statement(client):
    statement_id = _worker_with_statement(client)
    client.post("/api/auth/logout")

    client.post("/api/auth/register", json={
        "phone": "+254700000009",
        "full_name": "Other Worker",
        "password": "securepassword123",
    })
    assert client.post("/api/statements/{}/share".format(statement_id), json={}).status_code == 404


def test_unknown_token_is_a_flat_404(client):
    assert client.get("/api/statements/shared/not-a-real-token").status_code == 404
