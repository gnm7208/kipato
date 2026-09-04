import os
import sys

_project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_dir not in sys.path:
    sys.path.insert(0, _project_dir)

from flask import Flask, jsonify  # noqa: E402

from server.config import Config  # noqa: E402
from server.extensions import cors, db, limiter, migrate  # noqa: E402
from server.rbac import load_user  # noqa: E402


def create_app():
    Config.validate()

    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, origins=Config.FRONTEND_ORIGINS, supports_credentials=True)
    app.config["RATELIMIT_STORAGE_URI"] = Config.RATELIMIT_STORAGE_URI
    limiter.init_app(app)

    @app.before_request
    def before_request():
        load_user()

    register_error_handlers(app)
    register_blueprints(app)
    register_health_check(app)

    return app


def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "message": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden", "message": "Access denied"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found", "message": "Resource not found"}), 404

    @app.errorhandler(429)
    def rate_limit(e):
        return jsonify({"error": "Too many requests", "message": str(e.description)}), 429

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "message": "An unexpected error occurred"}), 500


def register_blueprints(app):
    from server.routes.admin import admin_bp
    from server.routes.auth import auth_bp
    from server.routes.income import income_bp
    from server.routes.mpesa import mpesa_bp
    from server.routes.statements import statements_bp

    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(income_bp, url_prefix="/api/income")
    app.register_blueprint(mpesa_bp, url_prefix="/api/mpesa")
    app.register_blueprint(statements_bp, url_prefix="/api/statements")


def register_health_check(app):
    @app.route("/api/health")
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
            return jsonify({"status": "healthy", "database": "connected"}), 200
        except Exception:
            return jsonify({"status": "unhealthy", "database": "disconnected"}), 500

    @app.route("/api/docs")
    def api_docs():
        return """<!DOCTYPE html>
<html>
<head>
  <title>Kipato API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: "/static/openapi.yaml", dom_id: "#swagger-ui" });
  </script>
</body>
</html>"""


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app = create_app()
    app.run(host=host, port=port, debug=debug)
