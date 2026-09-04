"""The database-backed rate limit counters.

These need a real Postgres, so they are skipped when one is not reachable.
Run the docker-compose stack to exercise them.
"""

import os
import time

import pytest

from server.utils.ratelimit_storage import PostgresStorage

RATELIMIT_TEST_URL = os.getenv(
    "RATELIMIT_TEST_DATABASE_URL",
    "postgresql+ratelimit://kipato:kipato@127.0.0.1:5433/kipato",
)


@pytest.fixture
def storage():
    store = PostgresStorage(RATELIMIT_TEST_URL)
    if not store.check():
        pytest.skip("no Postgres reachable for rate limit storage tests")
    store.clear("test:key")
    yield store
    store.clear("test:key")


def test_counts_up_across_calls(storage):
    assert [storage.incr("test:key", 60) for _ in range(3)] == [1, 2, 3]
    assert storage.get("test:key") == 3


def test_a_second_instance_sees_the_same_count(storage):
    storage.incr("test:key", 60)
    storage.incr("test:key", 60)

    # This is the whole point: a cold start must not reset the counter.
    other_instance = PostgresStorage(RATELIMIT_TEST_URL)
    assert other_instance.get("test:key") == 2
    assert other_instance.incr("test:key", 60) == 3


def test_window_resets_once_it_expires(storage):
    assert storage.incr("test:key", 1) == 1
    time.sleep(1.1)

    assert storage.get("test:key") == 0, "an expired window reads as empty"
    assert storage.incr("test:key", 60) == 1, "and starts counting again"


def test_expiry_is_not_extended_by_later_hits(storage):
    storage.incr("test:key", 60)
    first_expiry = storage.get_expiry("test:key")
    storage.incr("test:key", 60)

    assert storage.get_expiry("test:key") == pytest.approx(first_expiry, abs=0.001)


def test_elastic_expiry_does_push_the_window_out(storage):
    storage.incr("test:key", 60)
    first_expiry = storage.get_expiry("test:key")
    time.sleep(0.05)
    storage.incr("test:key", 60, elastic_expiry=True)

    assert storage.get_expiry("test:key") > first_expiry


def test_clearing_a_key_forgets_it(storage):
    storage.incr("test:key", 60)
    storage.clear("test:key")

    assert storage.get("test:key") == 0


def test_unknown_key_reads_as_zero(storage):
    assert storage.get("test:never-used") == 0
