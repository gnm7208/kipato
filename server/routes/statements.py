import secrets
from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify, request

from server.extensions import db, limiter
from server.models import IncomeEntry, Statement, StatementEntry
from server.rbac import login_required
from server.utils.timeutils import now_utc

statements_bp = Blueprint("statements", __name__)

DEFAULT_SHARE_DAYS = 30
MAX_SHARE_DAYS = 180


@statements_bp.route("/", methods=["GET"])
@login_required
def list_statements():
    user_id = g.current_user.id
    statements = Statement.query.filter_by(worker_id=user_id).order_by(Statement.generated_at.desc()).all()
    return jsonify({"statements": [s.to_dict() for s in statements]}), 200


@statements_bp.route("/", methods=["POST"])
@login_required
def create_statement():
    data = request.get_json() or {}
    start_date = data.get("start_date")
    end_date = data.get("end_date")

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return jsonify({"error": "start_date and end_date must be YYYY-MM-DD"}), 400

    if start > end:
        return jsonify({"error": "start_date must be before end_date"}), 400

    entries = IncomeEntry.query.filter(
        IncomeEntry.worker_id == g.current_user.id,
        IncomeEntry.date >= start,
        IncomeEntry.date <= end,
    ).all()

    total = sum(e.amount for e in entries)
    statement = Statement(
        worker_id=g.current_user.id,
        start_date=start,
        end_date=end,
        total_income=total,
        entry_count=len(entries),
    )
    db.session.add(statement)
    db.session.flush()

    for entry in entries:
        se = StatementEntry(statement_id=statement.id, income_entry_id=entry.id)
        db.session.add(se)

    db.session.commit()
    return jsonify(statement.to_dict()), 201


@statements_bp.route("/<int:statement_id>", methods=["GET"])
@login_required
def get_statement(statement_id):
    statement = Statement.query.filter_by(id=statement_id, worker_id=g.current_user.id).first_or_404()
    entries = [
        e.to_dict() for e in statement.income_entries
    ]
    return jsonify({**statement.to_dict(), "entries": entries}), 200


@statements_bp.route("/<int:statement_id>/share", methods=["POST"])
@login_required
@limiter.limit("20 per hour")
def share_statement(statement_id):
    """Turn a statement into a link the worker can hand to a lender.

    The link carries an unguessable token, expires on its own, and can be
    revoked. Re-sharing rotates the token, so an old link stops working.
    """
    statement = Statement.query.filter_by(
        id=statement_id, worker_id=g.current_user.id
    ).first_or_404()

    data = request.get_json(silent=True) or {}
    days = data.get("expires_in_days", DEFAULT_SHARE_DAYS)
    try:
        days = int(days)
    except (TypeError, ValueError):
        return jsonify({"error": "expires_in_days must be a whole number of days"}), 400
    if days < 1 or days > MAX_SHARE_DAYS:
        return jsonify({
            "error": "expires_in_days must be between 1 and {}".format(MAX_SHARE_DAYS),
        }), 400

    statement.share_token = secrets.token_urlsafe(32)
    statement.shared_at = now_utc()
    statement.share_expires_at = now_utc() + timedelta(days=days)
    db.session.commit()

    return jsonify({
        "message": "Statement shared",
        "statement": statement.to_dict(),
        "share_path": "/s/{}".format(statement.share_token),
    }), 200


@statements_bp.route("/<int:statement_id>/share", methods=["DELETE"])
@login_required
def revoke_statement_share(statement_id):
    statement = Statement.query.filter_by(
        id=statement_id, worker_id=g.current_user.id
    ).first_or_404()

    statement.share_token = None
    statement.shared_at = None
    statement.share_expires_at = None
    db.session.commit()

    return jsonify({"message": "Sharing stopped", "statement": statement.to_dict()}), 200


@statements_bp.route("/shared/<token>", methods=["GET"])
@limiter.limit("60 per minute")
def read_shared_statement(token):
    """Public: what a SACCO or lender sees when the worker sends them a link.

    Deliberately unauthenticated — that is the point of the feature — so it
    returns only what proves the income claim, and nothing else about the
    worker's account.
    """
    statement = Statement.query.filter_by(share_token=token).first()
    if statement is None:
        return jsonify({"error": "This statement link is not valid"}), 404
    if not statement.is_share_active():
        return jsonify({"error": "This statement link has expired"}), 410

    entries = IncomeEntry.query.filter(
        IncomeEntry.worker_id == statement.worker_id,
        IncomeEntry.date >= statement.start_date,
        IncomeEntry.date <= statement.end_date,
    ).order_by(IncomeEntry.date.desc()).all()

    worker = statement.worker
    return jsonify({
        "statement": {
            "start_date": statement.start_date.isoformat(),
            "end_date": statement.end_date.isoformat(),
            "total_income": float(statement.total_income),
            "entry_count": statement.entry_count,
            "generated_at": statement.generated_at.isoformat() if statement.generated_at else None,
            "expires_at": (
                statement.share_expires_at.isoformat() if statement.share_expires_at else None
            ),
        },
        "worker": {
            "full_name": worker.full_name,
            "phone": worker.phone,
            "member_since": worker.created_at.isoformat() if worker.created_at else None,
        },
        "entries": [
            {
                "date": entry.date.isoformat(),
                "amount": float(entry.amount),
                "method": entry.method.value if entry.method else None,
                "note": entry.note,
            }
            for entry in entries
        ],
    }), 200
