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
