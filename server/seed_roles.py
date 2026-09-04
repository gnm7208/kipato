import os
import sys

_project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_dir not in sys.path:
    sys.path.insert(0, _project_dir)

from server.extensions import db  # noqa: E402
from server.models import Role  # noqa: E402


def seed_roles():
    roles = [
        {"name": "worker", "description": "Informal worker who logs income"},
        {"name": "admin", "description": "Platform administrator"},
    ]
    for role_data in roles:
        if not Role.query.filter_by(name=role_data["name"]).first():
            role = Role(**role_data)
            db.session.add(role)
    db.session.commit()
    print("Roles seeded.")


def run():
    from server.app import create_app

    app = create_app()
    with app.app_context():
        seed_roles()


if __name__ == "__main__":
    run()
