"""Demo dataset.

A single worker with thirty identical entries shows nothing interesting. What a
reviewer, a SACCO or a designer needs to see is the shape of real informal work:
a boda rider who earns every single day, a fundi paid in irregular lumps, a mama
mboga whose takings are small but relentless, and someone who has just signed up
and logged almost nothing.

The generator is deterministic (fixed seed), so the same command always produces
the same database and screenshots stay comparable.
"""

import os
import random
import sys

_project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_dir not in sys.path:
    sys.path.insert(0, _project_dir)

from datetime import date, timedelta  # noqa: E402

from werkzeug.security import generate_password_hash  # noqa: E402

from server.extensions import db  # noqa: E402
from server.models import (  # noqa: E402
    IncomeEntry,
    IncomeMethod,
    MpesaImport,
    Role,
    Statement,
    StatementEntry,
    SyncStatus,
    User,
)
from server.seed_roles import seed_roles  # noqa: E402
from server.utils.timeutils import now_utc  # noqa: E402

DEMO_PASSWORD = "demopass123"
DEMO_WORKER_PHONE = "+254700000001"
DEMO_ADMIN_PHONE = "+254700000002"

SEED = 20260904

# Each worker is a different shape of informal income.
WORKER_PROFILES = [
    {
        "phone": DEMO_WORKER_PHONE,
        "full_name": "Demo Worker",
        "email": "worker@kipato.demo",
        "trade": "Boda boda rider",
        "days": 120,
        "work_days": (0, 1, 2, 3, 4, 5, 6),   # every day
        "amount": (450, 1100),
        "mpesa_share": 0.45,
        "notes": ["Morning trips", "Town runs", "School run", "Evening trips", "Delivery"],
        "trend": 0.0,
        "email_verified": True,
    },
    {
        "phone": "+254701234567",
        "full_name": "Grace Wanjiru",
        "email": "grace@kipato.demo",
        "trade": "Mama fua",
        "days": 150,
        "work_days": (0, 1, 2, 3, 4, 5),
        "amount": (500, 900),
        "mpesa_share": 0.25,
        "notes": ["Laundry — Kileleshwa", "Laundry — Kilimani", "House cleaning", "Ironing"],
        "trend": 0.15,
        "email_verified": True,
    },
    {
        "phone": "+254702345678",
        "full_name": "Peter Otieno",
        "email": None,
        "trade": "Fundi (mason)",
        "days": 180,
        "work_days": (0, 2, 4),              # irregular contracts
        "amount": (1500, 4500),
        "mpesa_share": 0.7,
        "notes": ["Site work — Ruaka", "Plastering job", "Foundation work", "Repairs"],
        "trend": 0.1,
        "email_verified": False,
    },
    {
        "phone": "+254703456789",
        "full_name": "Mary Atieno",
        "email": "mary@kipato.demo",
        "trade": "Mama mboga",
        "days": 200,
        "work_days": (0, 1, 2, 3, 4, 5, 6),
        "amount": (250, 700),
        "mpesa_share": 0.35,
        "notes": ["Market sales", "Sukuma and tomatoes", "Evening stall", "Weekend market"],
        "trend": 0.05,
        "email_verified": True,
    },
    {
        "phone": "+254704567890",
        "full_name": "Samuel Kamau",
        "email": None,
        "trade": "Matatu conductor",
        "days": 90,
        "work_days": (0, 1, 2, 3, 4, 5),
        "amount": (700, 1400),
        "mpesa_share": 0.2,
        "notes": ["Route 46", "Route 111", "Night shift", "Weekend route"],
        "trend": -0.1,                       # takings falling
        "email_verified": False,
    },
    {
        "phone": "+254705678901",
        "full_name": "Faith Njeri",
        "email": "faith@kipato.demo",
        "trade": "Salon and braiding",
        "days": 160,
        "work_days": (1, 2, 3, 4, 5, 6),
        "amount": (600, 2500),
        "mpesa_share": 0.8,
        "notes": ["Braiding", "Wash and blow-dry", "Home appointment", "Bridal booking"],
        "trend": 0.25,
        "email_verified": True,
    },
    {
        "phone": "+254706789012",
        "full_name": "Joseph Mwangi",
        "email": None,
        "trade": "Cobbler",
        "days": 210,
        "work_days": (0, 1, 2, 3, 4, 5),
        "amount": (150, 450),
        "mpesa_share": 0.15,
        "notes": ["Shoe repairs", "Sole replacement", "Bag stitching", "Polishing"],
        "trend": 0.0,
        "email_verified": False,
    },
    {
        "phone": "+254707890123",
        "full_name": "Esther Chebet",
        "email": "esther@kipato.demo",
        "trade": "Tailor",
        "days": 140,
        "work_days": (0, 1, 2, 3, 4),
        "amount": (800, 3000),
        "mpesa_share": 0.6,
        "notes": ["School uniforms", "Dress order", "Alterations", "Curtains"],
        "trend": 0.2,
        "email_verified": True,
    },
    {
        "phone": "+254708901234",
        "full_name": "Daniel Kiprop",
        "email": None,
        "trade": "Welder",
        "days": 100,
        "work_days": (1, 3, 5),
        "amount": (2000, 6000),
        "mpesa_share": 0.75,
        "notes": ["Gate fabrication", "Window grills", "Repair job", "Workshop order"],
        "trend": 0.1,
        "email_verified": False,
    },
    {
        "phone": "+254709012345",
        "full_name": "Alice Muthoni",
        "email": None,
        "trade": "Grocery kiosk",
        "days": 12,                          # just signed up
        "work_days": (0, 1, 2, 3, 4, 5, 6),
        "amount": (300, 800),
        "mpesa_share": 0.4,
        "notes": ["Kiosk sales", "Airtime and sales"],
        "trend": 0.0,
        "email_verified": False,
    },
]

MPESA_SENDERS = [
    "JOHN DOE", "JANE WANJIKU", "PETER KAMAU", "MARY ATIENO", "SAMUEL OTIENO",
    "GRACE NJERI", "DAVID KIPROP", "SARAH MUTHONI",
]


def seed_demo(verbose: bool = True):
    """Create the demo cast. Safe to run twice: it stops if the data is there."""
    if User.query.filter_by(phone=DEMO_WORKER_PHONE).first():
        if verbose:
            print("Demo data already exists.")
        return

    worker_role = Role.query.filter_by(name="worker").first()
    admin_role = Role.query.filter_by(name="admin").first()
    if not worker_role or not admin_role:
        seed_roles()
        worker_role = Role.query.filter_by(name="worker").first()
        admin_role = Role.query.filter_by(name="admin").first()

    rng = random.Random(SEED)
    password_hash = generate_password_hash(DEMO_PASSWORD)
    today = date.today()

    admin = User(
        phone=DEMO_ADMIN_PHONE,
        full_name="Demo Admin",
        email="admin@kipato.demo",
        role_id=admin_role.id,
        email_verified=True,
        password_hash=password_hash,
    )
    db.session.add(admin)

    totals = {"workers": 0, "entries": 0, "imports": 0, "statements": 0}

    for profile in WORKER_PROFILES:
        worker = User(
            phone=profile["phone"],
            full_name=profile["full_name"],
            email=profile["email"],
            role_id=worker_role.id,
            email_verified=profile["email_verified"],
            password_hash=password_hash,
        )
        db.session.add(worker)
        db.session.flush()
        totals["workers"] += 1

        entries = _build_entries(worker, profile, today, rng)
        db.session.add_all(entries)
        db.session.flush()
        totals["entries"] += len(entries)

        totals["imports"] += _build_imports(worker, profile, entries, today, rng)
        totals["statements"] += _build_statements(worker, entries, today)

    db.session.commit()

    if verbose:
        print("Demo data seeded.")
        print("  {workers} workers, {entries} income entries, "
              "{imports} M-PESA imports, {statements} statements".format(**totals))
        print("  worker: {} / {}".format(DEMO_WORKER_PHONE, DEMO_PASSWORD))
        print("  admin:  {} / {}".format(DEMO_ADMIN_PHONE, DEMO_PASSWORD))
        print("  every seeded worker uses the same password: {}".format(DEMO_PASSWORD))


def _build_entries(worker, profile, today, rng):
    """Generate one worker's history, following their own earning pattern."""
    low, high = profile["amount"]
    days = profile["days"]
    entries = []

    for offset in range(days):
        entry_date = today - timedelta(days=offset)
        if entry_date.weekday() not in profile["work_days"]:
            continue
        # Even the most reliable worker misses the odd day.
        if rng.random() < 0.12:
            continue

        # Older entries sit further from today, so the trend is applied in
        # reverse: a growing worker earned less months ago.
        progress = 1 - (offset / max(days, 1))
        multiplier = 1 + profile["trend"] * (progress - 0.5) * 2
        amount = round(rng.uniform(low, high) * max(multiplier, 0.35), -1)

        method = IncomeMethod.MPESA if rng.random() < profile["mpesa_share"] else IncomeMethod.CASH
        entry = IncomeEntry(
            worker_id=worker.id,
            amount=amount,
            date=entry_date,
            method=method,
            note=rng.choice(profile["notes"]),
            sync_status=SyncStatus.SYNCED,
            synced_at=now_utc(),
        )
        if method == IncomeMethod.MPESA:
            # Imported payments carry their transaction code as the idempotency key.
            entry.client_uuid = "mpesa:{}".format(_transaction_code(rng))
        entries.append(entry)

    # A couple of the most recent entries are still on their way to the server,
    # so the sync states in the UI are not all identical.
    for entry in entries[:2]:
        if rng.random() < 0.35:
            entry.sync_status = SyncStatus.PENDING
            entry.synced_at = None
            entry.client_uuid = entry.client_uuid or "offline:{}".format(_transaction_code(rng))

    return entries


def _build_imports(worker, profile, entries, today, rng):
    """Record the M-PESA imports that would have produced the mpesa entries."""
    mpesa_entries = [e for e in entries if e.method == IncomeMethod.MPESA]
    if len(mpesa_entries) < 5:
        return 0

    created = 0
    for index in range(rng.randint(1, 3)):
        batch = rng.randint(4, max(5, len(mpesa_entries) // 3))
        imported_on = today - timedelta(days=index * 30 + rng.randint(1, 10))
        db.session.add(MpesaImport(
            worker_id=worker.id,
            source_ref=rng.choice([
                "Phone backup", "Till statement", "September payments",
                "SMS export", "M-PESA statement",
            ]),
            file_name=rng.choice([None, "sms-backup.xml", "mpesa-statement.csv"]),
            entries_count=batch,
            raw_text="{} Confirmed. You have received Ksh{}.00 from {} on {} at 10:15 AM".format(
                _transaction_code(rng),
                int(mpesa_entries[0].amount),
                rng.choice(MPESA_SENDERS),
                imported_on.strftime("%-d/%-m/%y"),
            ),
        ))
        created += 1
    return created


def _build_statements(worker, entries, today):
    """Generate the statements a worker would have taken to a lender."""
    if len(entries) < 20:
        return 0

    created = 0
    for months_back in (1, 3):
        start = today - timedelta(days=months_back * 30)
        in_range = [e for e in entries if start <= e.date <= today]
        if not in_range:
            continue

        statement = Statement(
            worker_id=worker.id,
            start_date=start,
            end_date=today,
            total_income=sum(e.amount for e in in_range),
            entry_count=len(in_range),
        )
        db.session.add(statement)
        db.session.flush()
        for entry in in_range:
            db.session.add(StatementEntry(statement_id=statement.id, income_entry_id=entry.id))
        created += 1
    return created


def _transaction_code(rng):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
    return "".join(rng.choice(alphabet) for _ in range(10))
