from datetime import date, timedelta

from server.models import IncomeEntry, MpesaImport, Statement, User
from server.seed_data import (
    DEMO_ADMIN_PHONE,
    DEMO_PASSWORD,
    DEMO_WORKER_PHONE,
    REFERENCE_DATE,
    anchor_date,
    seed_demo,
)


def test_seed_creates_a_cast_of_workers(app):
    seed_demo(verbose=False)

    workers = User.query.join(User.role).filter_by(name="worker").all()
    assert len(workers) >= 8, "one worker demonstrates nothing"
    assert User.query.filter_by(phone=DEMO_ADMIN_PHONE).first().is_admin()


def test_seeded_accounts_can_actually_log_in(client, app):
    seed_demo(verbose=False)

    for phone in (DEMO_WORKER_PHONE, DEMO_ADMIN_PHONE):
        response = client.post("/api/auth/login", json={"phone": phone, "password": DEMO_PASSWORD})
        assert response.status_code == 200, phone


def test_seeded_workers_have_varied_histories(app):
    seed_demo(verbose=False)

    counts = []
    for worker in User.query.join(User.role).filter_by(name="worker").all():
        counts.append(IncomeEntry.query.filter_by(worker_id=worker.id).count())

    assert min(counts) < 20, "one worker should look newly signed up"
    assert max(counts) > 100, "another should have a long history"
    assert len(set(counts)) > 5, "histories should not all be the same length"


def test_seed_creates_imports_and_statements(app):
    seed_demo(verbose=False)

    assert MpesaImport.query.count() > 0
    assert Statement.query.count() > 0
    assert Statement.query.filter(Statement.entry_count > 0).count() > 0


def test_seeded_mpesa_entries_carry_their_transaction_key(app):
    seed_demo(verbose=False)

    mpesa = IncomeEntry.query.filter(IncomeEntry.client_uuid.like("mpesa:%")).count()
    assert mpesa > 0, "imported payments need the key that makes re-import safe"


def test_seed_is_idempotent(app):
    seed_demo(verbose=False)
    first = IncomeEntry.query.count()

    seed_demo(verbose=False)

    assert IncomeEntry.query.count() == first


def test_seed_is_deterministic(app):
    seed_demo(verbose=False)
    total = float(sum(e.amount for e in IncomeEntry.query.all()))

    # The fixed seed keeps screenshots and demos comparable between runs.
    assert IncomeEntry.query.count() == 940
    assert total == 1078020.0


def test_anchor_shares_the_reference_weekday():
    # Which weekday the history ends on decides how many work days fall in each
    # window, so the anchor must land on the same weekday whatever today is.
    for day in (date(2026, 9, 4), date(2026, 9, 19), date(2026, 9, 20), date(2027, 3, 3)):
        anchor = anchor_date(day)
        assert anchor.weekday() == REFERENCE_DATE.weekday()
        assert timedelta(0) <= day - anchor < timedelta(days=7)
