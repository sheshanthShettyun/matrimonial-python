"""Application factory. Port of MatrimonialApplication + SecurityConfig + WebConfig."""
import os
import secrets

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from .errors import register_error_handlers
from .extensions import bcrypt, db, migrate

load_dotenv()


def create_app(test_config=None):
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or _dev_secret()
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://root:root@127.0.0.1:3306/matrimonial_jpa_db",
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # Port of app.upload.dir (default "uploads/profiles", resolved against cwd).
    app.config["UPLOAD_DIR"] = os.environ.get("UPLOAD_DIR", "uploads/profiles")
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)

    # Port of the CORS configuration (credentials + localhost origins).
    CORS(app, resources={r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": "*",
    }}, supports_credentials=True)

    register_error_handlers(app)

    from . import models  # noqa: F401  (register models with SQLAlchemy)
    from .routes import auth, interests, profiles, upload

    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(profiles.bp, url_prefix="/api/profiles")
    app.register_blueprint(interests.bp, url_prefix="/api/interests")
    app.register_blueprint(upload.bp, url_prefix="/api/upload")
    # Static /uploads/** serving (port of WebConfig's resource handler).
    app.add_url_rule("/uploads/<path:filename>", endpoint="uploads",
                     view_func=upload.serve_upload)

    return app


def _dev_secret():
    # Dev-only fallback so sessions work without a .env; production must set SECRET_KEY.
    return "dev-only-secret-" + secrets.token_hex(16)
