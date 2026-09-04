from server.models import IncomeEntry, MpesaImport, Statement, User
from server.seed_data import DEMO_ADMIN_PHONE, DEMO_PASSWORD, DEMO_WORKER_PHONE, seed_demo


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
    assert total > 0
    assert IncomeEntry.query.count() == 940
