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
