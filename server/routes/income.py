from datetime import datetime

from flask import Blueprint, g, jsonify, request

from server.extensions import db, limiter
from server.models import IncomeEntry, IncomeMethod, SyncStatus
from server.rbac import login_required
from server.utils.timeutils import now_utc
from server.utils.validators import (
    validate_amount,
    validate_client_uuid,
    validate_date,
    validate_note,
)

income_bp = Blueprint("income", __name__)


@income_bp.route("/entries", methods=["GET"])
@login_required
def list_entries():
    user_id = g.current_user.id
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = IncomeEntry.query.filter_by(worker_id=user_id)

    if start_date:
        query = query.filter(IncomeEntry.date >= start_date)
    if end_date:
        query = query.filter(IncomeEntry.date <= end_date)

    query = query.order_by(IncomeEntry.date.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    entries = [e.to_dict() for e in pagination.items]
    return jsonify({
        "entries": entries,
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages,
    }), 200


@income_bp.route("/entries", methods=["POST"])
@login_required
@limiter.limit("30 per minute")
def create_entry():
    data = request.get_json() or {}
    amount_str = data.get("amount")
    date_str = data.get("date")
    method = data.get("method", "cash")
    note = data.get("note", "")

    amount_err = validate_amount(amount_str)
    if amount_err:
        return jsonify({"error": amount_err}), 400
    date_err = validate_date(date_str)
    if date_err:
        return jsonify({"error": date_err}), 400
    note_err = validate_note(note)
    if note_err:
        return jsonify({"error": note_err}), 400

    try:
        method_enum = IncomeMethod(method)
    except ValueError:
        return jsonify({"error": "method must be 'cash' or 'mpesa'"}), 400

    client_uuid = (data.get("client_uuid") or "").strip() or None
    uuid_err = validate_client_uuid(client_uuid)
    if uuid_err:
        return jsonify({"error": uuid_err}), 400

    if client_uuid:
        # An entry queued while offline may be replayed more than once; return
        # the entry we already stored instead of duplicating the worker's day.
        existing = IncomeEntry.query.filter_by(
            worker_id=g.current_user.id, client_uuid=client_uuid
        ).first()
        if existing:
            return jsonify(existing.to_dict()), 200

    entry = IncomeEntry(
        worker_id=g.current_user.id,
        client_uuid=client_uuid,
        amount=float(amount_str),
        date=datetime.strptime(date_str, "%Y-%m-%d").date(),
        method=method_enum,
        note=note,
        sync_status=SyncStatus.SYNCED,
        synced_at=now_utc(),
    )
    db.session.add(entry)
    db.session.commit()

    return jsonify(entry.to_dict()), 201


@income_bp.route("/entries/<int:entry_id>", methods=["GET"])
@login_required
def get_entry(entry_id):
    entry = IncomeEntry.query.filter_by(id=entry_id, worker_id=g.current_user.id).first_or_404()
    return jsonify(entry.to_dict()), 200


@income_bp.route("/entries/<int:entry_id>", methods=["PATCH"])
@login_required
def update_entry(entry_id):
    entry = IncomeEntry.query.filter_by(id=entry_id, worker_id=g.current_user.id).first_or_404()
    data = request.get_json() or {}

    if "amount" in data:
        amount_err = validate_amount(data.get("amount"))
        if amount_err:
            return jsonify({"error": amount_err}), 400
        entry.amount = float(data["amount"])

    if "date" in data:
        date_err = validate_date(data.get("date"))
        if date_err:
            return jsonify({"error": date_err}), 400
        entry.date = datetime.strptime(data["date"], "%Y-%m-%d").date()

    if "method" in data:
        try:
            entry.method = IncomeMethod(data["method"])
        except ValueError:
            return jsonify({"error": "method must be 'cash' or 'mpesa'"}), 400

    if "note" in data:
        note_err = validate_note(data.get("note"))
        if note_err:
            return jsonify({"error": note_err}), 400
        entry.note = data["note"]

    db.session.commit()
    return jsonify(entry.to_dict()), 200


@income_bp.route("/entries/<int:entry_id>", methods=["DELETE"])
@login_required
def delete_entry(entry_id):
    entry = IncomeEntry.query.filter_by(id=entry_id, worker_id=g.current_user.id).first_or_404()
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Entry deleted"}), 200


@income_bp.route("/trends", methods=["GET"])
@login_required
def trends():
    user_id = g.current_user.id
    entries = IncomeEntry.query.filter_by(worker_id=user_id).all()
    total = float(sum(e.amount for e in entries))
    count = len(entries)
    avg = total / count if count else 0

    daily = {}
    for e in entries:
        daily[str(e.date)] = daily.get(str(e.date), 0) + float(e.amount)

    return jsonify({
        "total_income": total,
        "entry_count": count,
        "average_daily": avg,
        "daily_breakdown": daily,
    }), 200
