"""Vercel entry point.

Vercel serves the built SPA as static files and rewrites `/api/*` to this
function, so the browser talks to a single origin and the session cookie behaves
exactly as it does locally.

A rewrite replaces the request path with the destination (`/api/index`), so the
route the browser actually asked for is carried across in `__original_path` and
put back before Flask sees the request.
"""

import os
import sys
from urllib.parse import parse_qsl, urlencode

_project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_dir not in sys.path:
    sys.path.insert(0, _project_dir)

from server.app import create_app  # noqa: E402

PATH_PARAM = "__original_path"

_flask_app = create_app()


def app(environ, start_response):
    params = parse_qsl(environ.get("QUERY_STRING", ""), keep_blank_values=True)
    original = next((value for key, value in params if key == PATH_PARAM), None)

    if original and original.startswith("/api/"):
        environ["PATH_INFO"] = original
        # Hand Flask the caller's own query string, without our marker.
        remaining = [(key, value) for key, value in params if key != PATH_PARAM]
        environ["QUERY_STRING"] = urlencode(remaining)

    return _flask_app(environ, start_response)
