import enum

from server.extensions import db
from server.utils.timeutils import now_utc


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))

    users = db.relationship("User", back_populates="role")

    def __repr__(self):
        return f"<Role {self.name}>"


class IncomeMethod(enum.Enum):
    CASH = "cash"
    MPESA = "mpesa"


class SyncStatus(enum.Enum):
    SYNCED = "synced"
    PENDING = "pending"
    FAILED = "failed"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    role = db.relationship("Role", back_populates="users")

    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    verification_expires = db.Column(db.DateTime, nullable=True)

    reset_token = db.Column(db.String(255), nullable=True, index=True)
    reset_expires = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=now_utc, nullable=False)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc, nullable=False)

    income_entries = db.relationship("IncomeEntry", back_populates="worker", cascade="all, delete-orphan")
    mpesa_imports = db.relationship("MpesaImport", back_populates="worker", cascade="all, delete-orphan")
    statements = db.relationship("Statement", back_populates="worker", cascade="all, delete-orphan")

    def set_role_by_name(self, name: str):
        role = Role.query.filter_by(name=name).first()
        if role:
            self.role_id = role.id

    def is_admin(self) -> bool:
        return self.role.name == "admin"

    def to_dict(self, include_email: bool = False) -> dict:
        data = {
            "id": self.id,
            "phone": self.phone,
            "full_name": self.full_name,
            "email_verified": self.email_verified,
            "role": self.role.name if self.role else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data["email"] = self.email
        return data

    def __repr__(self):
        return f"<User {self.phone}>"


class IncomeEntry(db.Model):
    __tablename__ = "income_entries"
    __table_args__ = (
        db.UniqueConstraint("worker_id", "client_uuid", name="uq_income_entry_worker_client"),
    )

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    # Set by the client (or the M-PESA transaction code) so an entry queued
    # offline can be replayed any number of times without duplicating.
    client_uuid = db.Column(db.String(64), nullable=True, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    method = db.Column(db.Enum(IncomeMethod), nullable=False, default=IncomeMethod.CASH)
    note = db.Column(db.String(255))
    sync_status = db.Column(db.Enum(SyncStatus), nullable=False, default=SyncStatus.PENDING)
    synced_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=now_utc, nullable=False)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc, nullable=False)

    worker = db.relationship("User", back_populates="income_entries")
    statement = db.relationship("Statement", back_populates="income_entries", secondary="statement_entries")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "amount": float(self.amount),
            "date": self.date.isoformat() if self.date else None,
            "method": self.method.value if self.method else None,
            "note": self.note,
            "sync_status": self.sync_status.value if self.sync_status else None,
            "synced_at": self.synced_at.isoformat() if self.synced_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "client_uuid": self.client_uuid,
        }

    def __repr__(self):
        return f"<IncomeEntry {self.amount} {self.date}>"


class MpesaImport(db.Model):
    __tablename__ = "mpesa_imports"

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    source_ref = db.Column(db.String(255), nullable=False)
    file_name = db.Column(db.String(255))
    entries_count = db.Column(db.Integer, default=0)
    raw_text = db.Column(db.Text)
    imported_at = db.Column(db.DateTime, default=now_utc, nullable=False)

    worker = db.relationship("User", back_populates="mpesa_imports")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "worker_id": self.worker_id,
            "source_ref": self.source_ref,
            "file_name": self.file_name,
            "entries_count": self.entries_count,
            "imported_at": self.imported_at.isoformat() if self.imported_at else None,
        }

    def __repr__(self):
        return f"<MpesaImport {self.source_ref}>"


class Statement(db.Model):
    __tablename__ = "statements"

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_income = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    entry_count = db.Column(db.Integer, nullable=False, default=0)
    generated_at = db.Column(db.DateTime, default=now_utc, nullable=False)

    # A statement is only proof if the worker can hand it to someone. Sharing is
    # off until they turn it on, expires on its own, and can be revoked.
    share_token = db.Column(db.String(64), unique=True, nullable=True, index=True)
    shared_at = db.Column(db.DateTime, nullable=True)
    share_expires_at = db.Column(db.DateTime, nullable=True)

    worker = db.relationship("User", back_populates="statements")
    income_entries = db.relationship("IncomeEntry", secondary="statement_entries")

    def is_share_active(self) -> bool:
        if not self.share_token:
            return False
        if self.share_expires_at and self.share_expires_at < now_utc():
            return False
        return True

    def to_dict(self, include_share: bool = True) -> dict:
        data = {
            "id": self.id,
            "worker_id": self.worker_id,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "total_income": float(self.total_income),
            "entry_count": self.entry_count,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None,
        }
        if include_share:
            active = self.is_share_active()
            data["share_token"] = self.share_token if active else None
            data["share_active"] = active
            data["share_expires_at"] = (
                self.share_expires_at.isoformat() if self.share_expires_at else None
            )
        return data

    def __repr__(self):
        return f"<Statement {self.start_date} - {self.end_date}>"


class StatementEntry(db.Model):
    __tablename__ = "statement_entries"

    id = db.Column(db.Integer, primary_key=True)
    statement_id = db.Column(db.Integer, db.ForeignKey("statements.id"), nullable=False)
    income_entry_id = db.Column(db.Integer, db.ForeignKey("income_entries.id"), nullable=False)

    def __repr__(self):
        return f"<StatementEntry stmt={self.statement_id} entry={self.income_entry_id}>"
