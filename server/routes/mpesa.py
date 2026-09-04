from flask import Blueprint, g, jsonify, request

from server.extensions import db, limiter
from server.models import IncomeEntry, IncomeMethod, MpesaImport, SyncStatus
from server.rbac import login_required
from server.utils.mpesa_bulk import detect_format, parse_bulk
from server.utils.timeutils import now_utc
from server.utils.validators import validate_note

mpesa_bp = Blueprint("mpesa", __name__)

# A full SMS-backup export of a year of messages runs to a few megabytes.
MAX_RAW_TEXT = 8_000_000
# Entries are flushed in batches so a large history does not build one enormous
# unit of work in memory.
BATCH_SIZE = 500


@mpesa_bp.route("/imports", methods=["GET"])
@login_required
def list_imports():
    user_id = g.current_user.id
    imports = MpesaImport.query.filter_by(worker_id=user_id).order_by(MpesaImport.imported_at.desc()).all()
    return jsonify({"imports": [i.to_dict() for i in imports]}), 200


@mpesa_bp.route("/imports/preview", methods=["POST"])
@login_required
@limiter.limit("30 per minute")
def preview_import():
    """Parse pasted text without saving, so the worker can check it first."""
    data = request.get_json() or {}
    raw_text = data.get("raw_text", "")

    if not raw_text:
        return jsonify({"error": "raw_text is required"}), 400
    if len(raw_text) > MAX_RAW_TEXT:
        return jsonify({"error": "raw_text is too long"}), 400

    parsed = parse_bulk(raw_text)
    limit = min(request.args.get("limit", 200, type=int), 1000)
    return jsonify({
        "entries": [_parsed_to_dict(p) for p in parsed[:limit]],
        "count": len(parsed),
        "truncated": len(parsed) > limit,
        "format": detect_format(raw_text),
    }), 200


@mpesa_bp.route("/imports", methods=["POST"])
@login_required
@limiter.limit("10 per minute")
def create_import():
    data = request.get_json() or {}
    source_ref = (data.get("source_ref") or "").strip()
    raw_text = data.get("raw_text", "")
    note = data.get("note", "")

    if not source_ref:
        return jsonify({"error": "source_ref is required"}), 400
    if not raw_text:
        return jsonify({"error": "raw_text is required"}), 400
    if len(raw_text) > MAX_RAW_TEXT:
        return jsonify({"error": "raw_text is too long"}), 400
    note_err = validate_note(note)
    if note_err:
        return jsonify({"error": note_err}), 400

    parsed = parse_bulk(raw_text)

    # One query for every code beats one query per message when a worker
    # imports a whole year at once.
    codes = {item["code"] for item in parsed if item["code"]}
    existing_uuids = set()
    if codes:
        wanted = ["mpesa:{}".format(code) for code in codes]
        for chunk_start in range(0, len(wanted), BATCH_SIZE):
            chunk = wanted[chunk_start:chunk_start + BATCH_SIZE]
            rows = db.session.query(IncomeEntry.client_uuid).filter(
                IncomeEntry.worker_id == g.current_user.id,
                IncomeEntry.client_uuid.in_(chunk),
            ).all()
            existing_uuids.update(row[0] for row in rows)

    created = 0
    skipped = 0
    seen_this_import = set()
    for item in parsed:
        # The M-PESA transaction code makes re-importing the same SMS a no-op.
        client_uuid = "mpesa:{}".format(item["code"]) if item["code"] else None

        if client_uuid and (client_uuid in existing_uuids or client_uuid in seen_this_import):
            skipped += 1
            continue
        if client_uuid:
            seen_this_import.add(client_uuid)

        entry = IncomeEntry(
            worker_id=g.current_user.id,
            client_uuid=client_uuid,
            amount=item["amount"],
            date=item["date"],
            method=IncomeMethod.MPESA,
            note=note or _default_note(item),
            sync_status=SyncStatus.SYNCED,
            synced_at=now_utc(),
        )
        db.session.add(entry)
        created += 1
        if created % BATCH_SIZE == 0:
            db.session.flush()

    mpesa_import = MpesaImport(
        worker_id=g.current_user.id,
        source_ref=source_ref,
        file_name=data.get("file_name"),
        entries_count=created,
        # Keep a sample for support, not the whole export.
        raw_text=raw_text[:20000],
    )
    db.session.add(mpesa_import)
    db.session.commit()

    payload = mpesa_import.to_dict()
    payload["parsed_count"] = len(parsed)
    payload["created_count"] = created
    payload["duplicate_count"] = skipped
    payload["format"] = detect_format(raw_text)
    return jsonify(payload), 201


def _default_note(item):
    sender = item.get("sender")
    return "M-PESA from {}".format(sender)[:255] if sender else "M-PESA payment"


def _parsed_to_dict(item):
    return {
        "code": item["code"],
        "amount": item["amount"],
        "date": item["date"].isoformat(),
        "sender": item["sender"],
        "raw": item["raw"],
    }
