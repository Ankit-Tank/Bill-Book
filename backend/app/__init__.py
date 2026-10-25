import os
from typing import Optional
from flask import Flask, request, jsonify, current_app
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

    # Enable CORS for mobile and web clients
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize database pool
    init_db_pool(app)

    # Register database connection teardown
    app.teardown_appcontext(close_db)

    # Register blueprints (one line per blueprint in routes/__init__.py)
    register_routes(app)

    # Authentication before_request hook
    @app.before_request
    def check_api_key():
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
            422: "INVALID_INPUT",
            500: "INTERNAL_ERROR",
        }
        error_code = code_map.get(error.code, "HTTP_ERROR")
        return jsonify({
            "error": {
                "code": error_code,
                "message": error.description or "An HTTP error occurred",
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

    return app
