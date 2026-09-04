"""Moderation and verification views for platform administrators.

Admins read worker records to verify income claims for a SACCO or lender; they
never create or edit a worker's entries, since the record has to stay
worker-owned to be worth anything.
"""

from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, or_

from server.extensions import db
from server.models import IncomeEntry, MpesaImport, Statement, User
from server.rbac import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/workers", methods=["GET"])
@admin_required
def list_workers():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = (request.args.get("search") or "").strip()

    query = User.query.join(User.role).filter_by(name="worker")
    if search:
        pattern = "%{}%".format(search)
        query = query.filter(or_(
            User.full_name.ilike(pattern),
            User.phone.ilike(pattern),
            User.email.ilike(pattern),
        ))

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    workers = []
    for worker in pagination.items:
        data = worker.to_dict(include_email=True)
        data.update(_worker_totals(worker.id))
        workers.append(data)

    return jsonify({
        "workers": workers,
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
    }), 200


@admin_bp.route("/workers/<int:worker_id>", methods=["GET"])
@admin_required
def get_worker(worker_id):
    worker = db.session.get(User, worker_id)
    if worker is None:
        return jsonify({"error": "Worker not found"}), 404

    data = worker.to_dict(include_email=True)
    data.update(_worker_totals(worker_id))
    data["import_count"] = MpesaImport.query.filter_by(worker_id=worker_id).count()
    data["statement_count"] = Statement.query.filter_by(worker_id=worker_id).count()
    return jsonify({"worker": data}), 200


@admin_bp.route("/workers/<int:worker_id>/entries", methods=["GET"])
@admin_required
def list_worker_entries(worker_id):
    worker = db.session.get(User, worker_id)
    if worker is None:
        return jsonify({"error": "Worker not found"}), 404

    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = IncomeEntry.query.filter_by(worker_id=worker_id)
    if start_date:
        parsed = _parse_date(start_date)
        if parsed is None:
            return jsonify({"error": "start_date must be YYYY-MM-DD"}), 400
        query = query.filter(IncomeEntry.date >= parsed)
    if end_date:
        parsed = _parse_date(end_date)
        if parsed is None:
            return jsonify({"error": "end_date must be YYYY-MM-DD"}), 400
        query = query.filter(IncomeEntry.date <= parsed)

    pagination = query.order_by(IncomeEntry.date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "entries": [e.to_dict() for e in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
    }), 200


@admin_bp.route("/workers/<int:worker_id>/statements", methods=["GET"])
@admin_required
def list_worker_statements(worker_id):
    worker = db.session.get(User, worker_id)
    if worker is None:
        return jsonify({"error": "Worker not found"}), 404

    statements = Statement.query.filter_by(worker_id=worker_id).order_by(
        Statement.generated_at.desc()
    ).all()
    return jsonify({"statements": [s.to_dict() for s in statements]}), 200


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def platform_stats():
    worker_count = User.query.join(User.role).filter_by(name="worker").count()
    entry_count = IncomeEntry.query.count()
    total_income = db.session.query(func.coalesce(func.sum(IncomeEntry.amount), 0)).scalar()

    return jsonify({
        "worker_count": worker_count,
        "entry_count": entry_count,
        "total_income": float(total_income or 0),
        "import_count": MpesaImport.query.count(),
        "statement_count": Statement.query.count(),
        "generated_by": g.current_user.to_dict()["full_name"],
    }), 200


def _worker_totals(worker_id):
    row = db.session.query(
        func.coalesce(func.sum(IncomeEntry.amount), 0),
        func.count(IncomeEntry.id),
        func.max(IncomeEntry.date),
    ).filter(IncomeEntry.worker_id == worker_id).one()

    return {
        "total_income": float(row[0] or 0),
        "entry_count": int(row[1] or 0),
        "last_entry_date": row[2].isoformat() if row[2] else None,
    }


def _parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None
