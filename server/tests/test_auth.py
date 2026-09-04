

def test_register(client):
    response = client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data["user"]["phone"] == "+254700000001"
    assert data["user"]["role"] == "worker"


def test_register_duplicate_phone(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    response = client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Another Worker",
        "password": "securepassword123",
    })
    assert response.status_code == 409


def test_login(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    response = client.post("/api/auth/login", json={
        "phone": "+254700000001",
        "password": "securepassword123",
    })
    assert response.status_code == 200
    assert response.get_json()["user"]["phone"] == "+254700000001"


def test_login_invalid(client):
    response = client.post("/api/auth/login", json={
        "phone": "+254700000001",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_me_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_authorized(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    response = client.get("/api/auth/me")
    assert response.status_code == 200


def _register(client, **overrides):
    payload = {
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    }
    payload.update(overrides)
    return client.post("/api/auth/register", json=payload)


def test_register_accepts_optional_email(client):
    response = _register(client, email="worker@example.com")
    assert response.status_code == 201
    assert response.get_json()["user"]["email"] == "worker@example.com"


def test_register_rejects_invalid_email(client):
    assert _register(client, email="not-an-email").status_code == 400


def test_register_rejects_duplicate_email(client):
    _register(client, email="worker@example.com")
    response = _register(client, phone="+254700000002", email="worker@example.com")
    assert response.status_code == 409


def test_update_profile(client):
    _register(client)
    response = client.patch("/api/auth/me", json={"full_name": "Renamed Worker"})
    assert response.status_code == 200
    assert response.get_json()["user"]["full_name"] == "Renamed Worker"


def test_verification_requires_an_email(client):
    _register(client)
    response = client.post("/api/auth/verify/request", json={})
    assert response.status_code == 400


def test_email_verification_round_trip(client, app):
    from server.models import User

    _register(client, email="worker@example.com")

    assert client.post("/api/auth/verify/request", json={}).status_code == 200

    # The conftest app context is already active, so this is the same session
    # the requests use.
    token = User.query.filter_by(phone="+254700000001").first().verification_token
    assert token

    assert client.post("/api/auth/verify/confirm", json={"token": "wrong"}).status_code == 400

    response = client.post("/api/auth/verify/confirm", json={"token": token})
    assert response.status_code == 200
    assert response.get_json()["user"]["email_verified"] is True


def test_expired_verification_token_is_rejected(client, app):
    from datetime import timedelta

    from server.extensions import db
    from server.models import User
    from server.utils.timeutils import now_utc

    _register(client, email="worker@example.com")
    client.post("/api/auth/verify/request", json={})

    user = User.query.filter_by(phone="+254700000001").first()
    token = user.verification_token
    user.verification_expires = now_utc() - timedelta(hours=1)
    db.session.commit()

    response = client.post("/api/auth/verify/confirm", json={"token": token})
    assert response.status_code == 400
    assert "expired" in response.get_json()["error"].lower()


def test_changing_email_clears_verified_flag(client):
    _register(client, email="worker@example.com")
    client.post("/api/auth/verify/request", json={})

    response = client.patch("/api/auth/me", json={"email": "different@example.com"})
    assert response.status_code == 200
    assert response.get_json()["user"]["email_verified"] is False


def test_verification_requires_login(client):
    assert client.post("/api/auth/verify/request", json={}).status_code == 401
