"""Rate-limit counters that survive a cold start.

The default in-process storage counts per instance, so on serverless every new
function instance starts everyone back at zero — which quietly turns
"5 login attempts per minute" into no limit at all.

This keeps the counters in the Postgres the app already has, so every instance
reads the same numbers. It is a fixed-window counter, which is what Flask-Limiter
asks a storage backend for; Redis is faster if the API ever gets busy enough to
care, and swapping to it means changing RATELIMIT_STORAGE_URI and nothing else.
"""

import time
from urllib.parse import urlparse

from limits.storage import Storage
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

SCHEMA = """
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    expires_at DOUBLE PRECISION NOT NULL
)
"""


class PostgresStorage(Storage):
    """Fixed-window counters in Postgres, addressed as ``postgresql+ratelimit://``."""

    STORAGE_SCHEME = ["postgresql+ratelimit", "postgres+ratelimit"]

    def __init__(self, uri: str, wrap_exceptions: bool = False, **options):
        super().__init__(uri, wrap_exceptions=wrap_exceptions, **options)
        parsed = urlparse(uri)
        database_url = parsed._replace(
            scheme=parsed.scheme.replace("+ratelimit", "")
        ).geturl()

        self._engine = create_engine(
            database_url,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=1,
            pool_recycle=280,
        )
        self._ready = False

    def _ensure_schema(self, connection):
        if not self._ready:
            connection.execute(text(SCHEMA))
            self._ready = True

    @property
    def base_exceptions(self):
        return SQLAlchemyError

    def incr(self, key: str, expiry: int, elastic_expiry: bool = False, amount: int = 1) -> int:
        now = time.time()
        expires_at = now + expiry

        with self._engine.begin() as connection:
            self._ensure_schema(connection)
            # One statement decides whether this is a new window or an existing
            # one, so two instances hitting the same key cannot race.
            row = connection.execute(
                text("""
                    INSERT INTO rate_limits (key, count, expires_at)
                    VALUES (:key, :amount, :expires_at)
                    ON CONFLICT (key) DO UPDATE SET
                        count = CASE
                            WHEN rate_limits.expires_at < :now THEN :amount
                            ELSE rate_limits.count + :amount
                        END,
                        expires_at = CASE
                            WHEN rate_limits.expires_at < :now THEN :expires_at
                            WHEN :elastic THEN :expires_at
                            ELSE rate_limits.expires_at
                        END
                    RETURNING count
                """),
                {
                    "key": key,
                    "amount": amount,
                    "expires_at": expires_at,
                    "now": now,
                    "elastic": elastic_expiry,
                },
            ).first()
        return int(row[0]) if row else amount

    def get(self, key: str) -> int:
        with self._engine.begin() as connection:
            self._ensure_schema(connection)
            row = connection.execute(
                text("SELECT count FROM rate_limits WHERE key = :key AND expires_at >= :now"),
                {"key": key, "now": time.time()},
            ).first()
        return int(row[0]) if row else 0

    def get_expiry(self, key: str) -> float:
        with self._engine.begin() as connection:
            self._ensure_schema(connection)
            row = connection.execute(
                text("SELECT expires_at FROM rate_limits WHERE key = :key"),
                {"key": key},
            ).first()
        return float(row[0]) if row else time.time()

    def check(self) -> bool:
        try:
            with self._engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            return False

    def reset(self):
        with self._engine.begin() as connection:
            self._ensure_schema(connection)
            result = connection.execute(text("DELETE FROM rate_limits"))
        return result.rowcount

    def clear(self, key: str):
        with self._engine.begin() as connection:
            self._ensure_schema(connection)
            connection.execute(text("DELETE FROM rate_limits WHERE key = :key"), {"key": key})
