import os
import time
import uuid
import logging
from typing import Optional
from flask import Flask, request, jsonify, current_app, g
from flask_cors import CORS
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException

from .config import Config
from .db import init_db_pool, close_db, close_db_pool
from .routes import register_routes


class APIError(Exception):
    """Custom application error returning standard error envelope."""
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def create_app(config_class=None) -> Flask:
    """Application factory for BillBook Flask API."""
    app = Flask(__name__)

    # Load configuration
    if config_class is None:
        config_class = Config
    app.config.from_object(config_class)

    # Hardening: Maximum file upload size (16MB)
    app.config.setdefault("MAX_CONTENT_LENGTH", 16 * 1024 * 1024)

    # Hardening: Configure structured logging
    logging.basicConfig(
        format="[%(asctime)s] [%(levelname)s] [billbook] %(name)s: %(message)s",
        level=logging.INFO if not app.config.get("DEBUG") else logging.DEBUG,
    )

    # Hardening: Lock CORS to PieHost and local dev addresses
    import re
    allowed_origins = [
        re.compile(r"^https?://([a-zA-Z0-9-]+\.)*piehost\.com(:\d+)?$"),
        "https://piehost.com",
        "https://www.piehost.com",
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8081",
    ]
    env_origins = os.environ.get("CORS_ALLOWED_ORIGINS")
    if env_origins:
        allowed_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

    CORS(app, origins=allowed_origins, supports_credentials=True)

    # Initialize database pool
    init_db_pool(app)

    # Register database connection teardown
    app.teardown_appcontext(close_db)

    # Register blueprints (one line per blueprint in routes/__init__.py)
    register_routes(app)

    # Structured request logging and timing hook
    @app.before_request
    def before_request_hook():
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        g.start_time = time.time()

        # Allow OPTIONS for CORS preflight
        if request.method == "OPTIONS":
            return None

        # Allow health checks without X-API-Key
        clean_path = request.path.rstrip("/")
        if clean_path in ["/health", "/api/v1/health"]:
            return None

        expected_key = current_app.config.get("API_KEY")
        client_key = request.headers.get("X-API-Key")

        if not client_key or (expected_key and client_key != expected_key):
            raise APIError("UNAUTHORIZED", "Invalid or missing API key", 401)

        return None

    @app.after_request
    def after_request_hook(response):
        duration_ms = round((time.time() - getattr(g, "start_time", time.time())) * 1000, 2)
        req_id = getattr(g, "request_id", "-")
        response.headers["X-Request-ID"] = req_id

        # Structured request log entry
        app.logger.info(
            f"req_id={req_id} method={request.method} path={request.path} "
            f"status={response.status_code} duration_ms={duration_ms} ip={request.remote_addr}"
        )
        return response

    # Standard error handlers
    @app.errorhandler(APIError)
    def handle_api_error(error: APIError):
        return jsonify({
            "error": {
                "code": error.code,
                "message": error.message,
            }
        }), error.status_code

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        err_details = []
        for err in error.errors():
            loc = ".".join(str(x) for x in err.get("loc", []))
            msg = err.get("msg", "Invalid value")
            if loc:
                err_details.append(f"Field '{loc}': {msg}")
            else:
                err_details.append(msg)
        joined_msg = "; ".join(err_details) if err_details else "Validation failed"
        return jsonify({
            "error": {
                "code": "INVALID_INPUT",
                "message": joined_msg,
            }
        }), 400

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            413: "PAYLOAD_TOO_LARGE",
            422: "INVALID_INPUT",
            429: "RATE_LIMIT_EXCEEDED",
            500: "INTERNAL_ERROR",
        }
        error_code = code_map.get(error.code, "HTTP_ERROR")
        desc = error.description or "An HTTP error occurred"
        if error.code == 413:
            desc = "Upload payload exceeds maximum allowable size of 16MB"
        elif error.code == 429:
            desc = "Rate limit exceeded. Please try again later."

        return jsonify({
            "error": {
                "code": error_code,
                "message": desc,
            }
        }), error.code

    @app.errorhandler(Exception)
    def handle_generic_exception(error: Exception):
        current_app.logger.exception("Unexpected unhandled exception: %s", error)
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal server error occurred",
            }
        }), 500

    # APScheduler for daily background alert jobs (disabled during testing)
    if not app.config.get("TESTING") and not os.environ.get("DISABLE_SCHEDULER"):
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from .services.alerts import evaluate_all_alerts_scheduled
            scheduler = BackgroundScheduler(daemon=True)
            scheduler.add_job(
                func=evaluate_all_alerts_scheduled,
                trigger="cron",
                hour=0,
                minute=0,
                id="daily_alerts_job",
                replace_existing=True,
            )
            scheduler.start()
            app.extensions["scheduler"] = scheduler
        except Exception as e:
            app.logger.warning("APScheduler startup failed: %s", e)

    return app

