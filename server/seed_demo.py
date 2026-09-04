import os
import sys

_project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_dir not in sys.path:
    sys.path.insert(0, _project_dir)

from server.seed_data import seed_demo  # noqa: E402
from server.seed_roles import seed_roles  # noqa: E402


def run():
    from server.app import create_app

    app = create_app()
    with app.app_context():
        seed_roles()
        seed_demo()


if __name__ == "__main__":
    run()
