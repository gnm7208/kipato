import os

import pytest

from server.app import create_app
from server.extensions import db
from server.seed_roles import seed_roles


@pytest.fixture
def app():
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["FLASK_DEBUG"] = "false"
    os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173"

    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with app.app_context():
        db.create_all()
        seed_roles()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def mail_enabled(monkeypatch):
    """A deployment that can actually deliver mail.

    Verification and password reset refuse to pretend when no mailer is
    configured, so the flows that depend on email have to say they have one.
    Delivery itself is stubbed: the tests are about the token, not about SMTP.
    """
    from server.config import Config

    monkeypatch.setattr(Config, "SMTP_HOST", "smtp.test")
    monkeypatch.setattr("server.routes.auth.send_email", lambda *args, **kwargs: True)
