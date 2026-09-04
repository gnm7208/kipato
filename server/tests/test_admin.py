import pytest

from server.extensions import db
from server.models import User


@pytest.fixture
def worker(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000001",
        "full_name": "Test Worker",
        "password": "securepassword123",
    })
    client.post("/api/income/entries", json={
        "amount": 750, "date": "2026-09-04", "method": "cash",
    })
    worker_id = User.query.filter_by(phone="+254700000001").first().id
    client.post("/api/auth/logout")
    return worker_id


def login_as_admin(client):
    client.post("/api/auth/register", json={
        "phone": "+254700000002",
        "full_name": "Test Admin",
        "password": "securepassword123",
    })
    admin = User.query.filter_by(phone="+254700000002").first()
    admin.set_role_by_name("admin")
    db.session.commit()
    return admin


def test_admin_routes_reject_anonymous(client):
    assert client.get("/api/admin/stats").status_code == 401


def test_admin_routes_reject_workers(client, worker):
    client.post("/api/auth/login", json={
        "phone": "+254700000001", "password": "securepassword123",
    })
    assert client.get("/api/admin/stats").status_code == 403
    assert client.get("/api/admin/workers").status_code == 403


def test_admin_lists_workers_with_totals(client, worker):
    login_as_admin(client)
    response = client.get("/api/admin/workers")

    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 1, "admins are not listed as workers"
    listed = data["workers"][0]
    assert listed["phone"] == "+254700000001"
    assert listed["total_income"] == 750.0
    assert listed["entry_count"] == 1
    assert listed["last_entry_date"] == "2026-09-04"


def test_admin_can_search_workers(client, worker):
    login_as_admin(client)
    assert client.get("/api/admin/workers?search=Test Worker").get_json()["total"] == 1
    assert client.get("/api/admin/workers?search=nobody").get_json()["total"] == 0


def test_admin_reads_a_workers_entries(client, worker):
    login_as_admin(client)
    response = client.get("/api/admin/workers/{}/entries".format(worker))

    assert response.status_code == 200
    entries = response.get_json()["entries"]
    assert len(entries) == 1
    assert entries[0]["amount"] == 750.0


def test_admin_entry_date_filter_validates_input(client, worker):
    login_as_admin(client)
    url = "/api/admin/workers/{}/entries?start_date=not-a-date".format(worker)
    assert client.get(url).status_code == 400


def test_admin_gets_worker_detail(client, worker):
    login_as_admin(client)
    response = client.get("/api/admin/workers/{}".format(worker))

    assert response.status_code == 200
    data = response.get_json()["worker"]
    assert data["entry_count"] == 1
    assert data["statement_count"] == 0


def test_admin_unknown_worker_is_404(client):
    login_as_admin(client)
    assert client.get("/api/admin/workers/9999").status_code == 404


def test_admin_platform_stats(client, worker):
    login_as_admin(client)
    stats = client.get("/api/admin/stats").get_json()

    assert stats["worker_count"] == 1
    assert stats["entry_count"] == 1
    assert stats["total_income"] == 750.0
