from functools import wraps

from flask import g, jsonify, session

from server.extensions import db
from server.models import User


def load_user():
    user_id = session.get("user_id")
    g.current_user = db.session.get(User, user_id) if user_id else None


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.current_user is None:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.current_user is None:
            return jsonify({"error": "Authentication required"}), 401
        if not g.current_user.is_admin():
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated
