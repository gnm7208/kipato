import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = None
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {}
    SECRET_KEY = None
    SESSION_COOKIE_SECURE = None
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = None
    RATELIMIT_STORAGE_URI = None
    FLASK_DEBUG = None
    FLASK_HOST = None
    FLASK_PORT = None
    FRONTEND_ORIGINS = None

    SMTP_HOST = None
    SMTP_PORT = None
    SMTP_USER = None
    SMTP_PASSWORD = None
    FROM_EMAIL = None

    @classmethod
    def validate(cls):
        required = ["DATABASE_URL", "SECRET_KEY"]
        missing = [key for key in required if not os.getenv(key)]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

        database_url = os.getenv("DATABASE_URL", "postgresql://localhost/kipato")
        # Managed Postgres still hands out the legacy scheme SQLAlchemy dropped.
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        cls.SQLALCHEMY_DATABASE_URI = database_url

        if database_url.startswith("postgresql"):
            # Serverless platforms suspend idle compute and recycle connections,
            # so a pooled connection has to be checked before it is handed out.
            cls.SQLALCHEMY_ENGINE_OPTIONS = {
                "pool_pre_ping": True,
                "pool_recycle": 280,
                "pool_size": int(os.getenv("DB_POOL_SIZE", 5)),
                "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", 2)),
            }
        else:
            # validate() fully defines the config every time it runs; leaving a
            # previous value in place would hand SQLite pool arguments it
            # rejects outright.
            cls.SQLALCHEMY_ENGINE_OPTIONS = {}
        cls.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
        cls.FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
        cls.FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
        cls.FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))
        cls.FRONTEND_ORIGINS = [
            origin.strip()
            for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]

        # A cross-site session cookie has to be Secure and SameSite=None, which
        # only makes sense over HTTPS; local development stays on Lax.
        cross_site = os.getenv("CROSS_SITE_COOKIES", "false").lower() == "true"
        cls.SESSION_COOKIE_SECURE = cross_site or os.getenv(
            "SESSION_COOKIE_SECURE", "false"
        ).lower() == "true"
        cls.SESSION_COOKIE_SAMESITE = "None" if cross_site else "Lax"

        # In-process counters restart with every new instance, so on a
        # serverless platform they amount to no rate limit at all. Fall back to
        # the database there unless something better is configured.
        configured = os.getenv("RATELIMIT_STORAGE_URI")
        if configured:
            cls.RATELIMIT_STORAGE_URI = configured
        elif os.getenv("VERCEL") and database_url.startswith("postgresql"):
            cls.RATELIMIT_STORAGE_URI = database_url.replace(
                "postgresql", "postgresql+ratelimit", 1
            )
        else:
            cls.RATELIMIT_STORAGE_URI = "memory://"

        cls.SMTP_HOST = os.getenv("SMTP_HOST")
        cls.SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
        cls.SMTP_USER = os.getenv("SMTP_USER")
        cls.SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
        cls.FROM_EMAIL = os.getenv("FROM_EMAIL")
