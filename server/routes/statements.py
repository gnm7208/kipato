from datetime import datetime

from flask import Blueprint, g, jsonify, request

from server.extensions import db
from server.models import IncomeEntry, Statement, StatementEntry
from server.rbac import login_required

statements_bp = Blueprint("statements", __name__)


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
