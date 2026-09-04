from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
# No storage_uri here on purpose: Flask-Limiter resolves it as
# `constructor or config`, so passing one would silently override
# RATELIMIT_STORAGE_URI and leave the app counting in process memory.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
)
