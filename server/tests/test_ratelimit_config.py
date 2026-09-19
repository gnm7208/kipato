"""The limiter must use the storage the config asks for.

Flask-Limiter resolves storage as `constructor argument or config`, so passing
a storage_uri when building the Limiter silently overrides
RATELIMIT_STORAGE_URI. That failure is invisible from outside the process: the
app keeps answering requests, it just stops enforcing any limit once there is
more than one instance.
"""

import os

import pytest

from server.app import create_app
from server.extensions import limiter


def _app_with(monkeypatch, **env):
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    return create_app()


def test_uses_the_configured_storage(monkeypatch):
    app = _app_with(
        monkeypatch,
        DATABASE_URL="sqlite:///:memory:",
        RATELIMIT_STORAGE_URI="memory://",
    )
    with app.app_context():
        assert "MemoryStorage" in type(limiter.storage).__name__


def test_serverless_defaults_to_shared_storage(monkeypatch):
    from server.config import Config

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("RATELIMIT_STORAGE_URI", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@example.test/db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")

    Config.validate()

    assert Config.RATELIMIT_STORAGE_URI.startswith("postgresql+ratelimit://"), (
        "in-process counters reset on every cold start, so serverless has to share"
    )


def test_local_runs_stay_in_process(monkeypatch):
    from server.config import Config

    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.delenv("RATELIMIT_STORAGE_URI", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@example.test/db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")

    Config.validate()

    assert Config.RATELIMIT_STORAGE_URI == "memory://"


def test_an_explicit_setting_wins(monkeypatch):
    from server.config import Config

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("RATELIMIT_STORAGE_URI", "redis://example.test:6379")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@example.test/db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")

    Config.validate()

    assert Config.RATELIMIT_STORAGE_URI == "redis://example.test:6379"


@pytest.fixture(autouse=True)
def _restore_env():
    yield
    os.environ.pop("VERCEL", None)


def test_validate_does_not_leave_postgres_pooling_behind(monkeypatch):
    """Config is a class, so a previous call's values persist until overwritten."""
    from server.config import Config

    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@example.test/db")
    Config.validate()
    assert "pool_size" in Config.SQLALCHEMY_ENGINE_OPTIONS

    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    Config.validate()

    # SQLite rejects pool_size outright, so a stale value breaks every later app.
    assert Config.SQLALCHEMY_ENGINE_OPTIONS == {}


def test_client_address_comes_from_the_proxy_when_trusted(monkeypatch):
    """Behind a CDN, per-IP limits only work if the forwarded address is used."""
    monkeypatch.setenv("TRUST_PROXY", "true")
    app = _app_with(monkeypatch, DATABASE_URL="sqlite:///:memory:")

    @app.route("/whoami")
    def whoami():
        from flask import request
        return {"ip": request.remote_addr}

    response = app.test_client().get("/whoami", headers={"X-Forwarded-For": "41.90.1.1"})
    assert response.get_json()["ip"] == "41.90.1.1"


def test_forwarded_headers_are_ignored_when_not_behind_a_proxy(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY", "false")
    app = _app_with(monkeypatch, DATABASE_URL="sqlite:///:memory:")

    @app.route("/whoami")
    def whoami():
        from flask import request
        return {"ip": request.remote_addr}

    # Trusting this without a proxy in front would let anyone forge their IP.
    response = app.test_client().get("/whoami", headers={"X-Forwarded-For": "41.90.1.1"})
    assert response.get_json()["ip"] != "41.90.1.1"
