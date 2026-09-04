import secrets
from datetime import timedelta

from flask import Blueprint, current_app, g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from server.extensions import db, limiter
from server.models import Role, User
from server.rbac import login_required
from server.utils.mailer import email_is_configured, send_email
from server.utils.timeutils import now_utc
from server.utils.validators import (
    validate_email,
    validate_full_name,
    validate_password,
    validate_phone,
)

auth_bp = Blueprint("auth", __name__)

RATE_LIMIT = "15 per minute"
LOGIN_RATE_LIMIT = "5 per minute"
REGISTER_RATE_LIMIT = "3 per minute"
VERIFY_RATE_LIMIT = "5 per minute"
RESET_RATE_LIMIT = "5 per minute"
VERIFICATION_TTL = timedelta(hours=24)
RESET_TTL = timedelta(hours=1)


@auth_bp.route("/register", methods=["POST"])
@limiter.limit(REGISTER_RATE_LIMIT)
def register():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    full_name = data.get("full_name", "").strip()
    password = data.get("password", "")
    email = (data.get("email") or "").strip() or None

    phone_err = validate_phone(phone)
    if phone_err:
        return jsonify({"error": phone_err}), 400
    name_err = validate_full_name(full_name)
    if name_err:
        return jsonify({"error": name_err}), 400
    pwd_err = validate_password(password)
    if pwd_err:
        return jsonify({"error": pwd_err}), 400
    if email:
        email_err = validate_email(email)
        if email_err:
            return jsonify({"error": email_err}), 400

    if User.query.filter_by(phone=phone).first():
        return jsonify({"error": "Phone number already registered"}), 409
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    worker_role = Role.query.filter_by(name="worker").first()
    if not worker_role:
        return jsonify({"error": "Server misconfigured: worker role missing"}), 500

    user = User(phone=phone, full_name=full_name, email=email, role_id=worker_role.id)
    user.password_hash = generate_password_hash(password)

    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "Registration successful",
        "user": user.to_dict(include_email=True),
    }), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit(LOGIN_RATE_LIMIT)
def login():
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    password = data.get("password", "")

    if not phone or not password:
        return jsonify({"error": "Phone and password are required"}), 400

    user = User.query.filter_by(phone=phone).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(include_email=True),
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user": g.current_user.to_dict(include_email=True)}), 200


@auth_bp.route("/me", methods=["PATCH"])
@login_required
@limiter.limit(RATE_LIMIT)
def update_me():
    data = request.get_json() or {}
    user = g.current_user

    if "full_name" in data:
        full_name = (data.get("full_name") or "").strip()
        name_err = validate_full_name(full_name)
        if name_err:
            return jsonify({"error": name_err}), 400
        user.full_name = full_name

    if "email" in data:
        email = (data.get("email") or "").strip() or None
        if email:
            email_err = validate_email(email)
            if email_err:
                return jsonify({"error": email_err}), 400
            clash = User.query.filter(User.email == email, User.id != user.id).first()
            if clash:
                return jsonify({"error": "Email already registered"}), 409
        if email != user.email:
            # A new address has to earn its verified badge again.
            user.email = email
            user.email_verified = False
            user.verification_token = None
            user.verification_expires = None

    db.session.commit()
    return jsonify({"user": user.to_dict(include_email=True)}), 200


@auth_bp.route("/verify/request", methods=["POST"])
@login_required
@limiter.limit(VERIFY_RATE_LIMIT)
def request_verification():
    user = g.current_user

    if not user.email:
        return jsonify({"error": "Add an email address before requesting verification"}), 400
    if user.email_verified:
        return jsonify({"message": "Email is already verified"}), 200
    if not email_is_configured() and not current_app.config.get("FLASK_DEBUG"):
        return jsonify({
            "error": "Email verification is not available on this deployment",
        }), 503

    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_expires = now_utc() + VERIFICATION_TTL
    db.session.commit()

    send_email(
        user.email,
        "Verify your Kipato email",
        "Hi {},\n\nUse this code to verify your Kipato email address:\n\n{}\n\n"
        "It expires in 24 hours. If you did not ask for this, ignore this message."
        .format(user.full_name, token),
    )

    response = {"message": "Verification email sent"}
    if current_app.config.get("FLASK_DEBUG"):
        # Debug builds have no mail server; surface the token so the flow is testable.
        response["token"] = token
    return jsonify(response), 200


@auth_bp.route("/verify/confirm", methods=["POST"])
@login_required
@limiter.limit(VERIFY_RATE_LIMIT)
def confirm_verification():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    user = g.current_user

    if not token:
        return jsonify({"error": "token is required"}), 400
    if user.email_verified:
        return jsonify({"message": "Email is already verified"}), 200
    if not user.verification_token or not secrets.compare_digest(user.verification_token, token):
        return jsonify({"error": "Invalid verification token"}), 400
    if not user.verification_expires or user.verification_expires < now_utc():
        return jsonify({"error": "Verification token has expired"}), 400

    user.email_verified = True
    user.verification_token = None
    user.verification_expires = None
    db.session.commit()

    return jsonify({
        "message": "Email verified",
        "user": user.to_dict(include_email=True),
    }), 200


@auth_bp.route("/password/forgot", methods=["POST"])
@limiter.limit(RESET_RATE_LIMIT)
def forgot_password():
    """Start a password reset.

    Always answers the same way, whether or not the phone is registered: a
    different answer would tell a stranger which numbers have accounts.
    """
    if not email_is_configured() and not current_app.config.get("FLASK_DEBUG"):
        return jsonify({
            "error": "Password reset is not available on this deployment",
        }), 503

    data = request.get_json() or {}
    phone = (data.get("phone") or "").strip()

    generic = {"message": "If that account exists and has an email, a reset link is on its way"}

    user = User.query.filter_by(phone=phone).first() if phone else None
    if not user or not user.email:
        return jsonify(generic), 200

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_expires = now_utc() + RESET_TTL
    db.session.commit()

    send_email(
        user.email,
        "Reset your Kipato password",
        "Hi {},\n\nUse this code to set a new Kipato password:\n\n{}\n\n"
        "It expires in one hour. If you did not ask for this, ignore this message "
        "— your password has not changed."
        .format(user.full_name, token),
    )

    response = dict(generic)
    if current_app.config.get("FLASK_DEBUG"):
        # Debug builds have no mail server; surface the token so the flow is testable.
        response["token"] = token
    return jsonify(response), 200


@auth_bp.route("/password/reset", methods=["POST"])
@limiter.limit(RESET_RATE_LIMIT)
def reset_password():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    password = data.get("password", "")

    if not token:
        return jsonify({"error": "token is required"}), 400
    pwd_err = validate_password(password)
    if pwd_err:
        return jsonify({"error": pwd_err}), 400

    user = User.query.filter_by(reset_token=token).first()
    if user is None:
        return jsonify({"error": "Invalid or expired reset token"}), 400
    if not user.reset_expires or user.reset_expires < now_utc():
        return jsonify({"error": "Invalid or expired reset token"}), 400

    user.password_hash = generate_password_hash(password)
    user.reset_token = None
    user.reset_expires = None
    db.session.commit()

    # Whoever asked for the reset proved control of the mailbox; signing them in
    # saves a second trip through the login screen.
    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "Password updated",
        "user": user.to_dict(include_email=True),
    }), 200
