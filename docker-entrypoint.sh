#!/bin/sh
# Wait for Postgres, apply migrations, make sure roles exist, then hand over to
# whatever command the image (or docker-compose) asked for.
set -e

python - <<'PY'
import os
import sys
import time
from urllib.parse import urlparse

url = urlparse(os.environ["DATABASE_URL"])
if url.scheme.startswith("postgres"):
    import socket

    host = url.hostname or "localhost"
    port = url.port or 5432
    for attempt in range(60):
        try:
            with socket.create_connection((host, port), timeout=2):
                print("Database is accepting connections.")
                break
        except OSError:
            time.sleep(1)
    else:
        print("Database never became reachable at {}:{}".format(host, port))
        sys.exit(1)
PY

cd /app/server
flask db upgrade
python seed_roles.py
cd /app

exec "$@"
