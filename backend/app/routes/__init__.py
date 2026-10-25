from flask import Flask
from .ai import ai_bp


def register_routes(app: Flask) -> None:
    """Register route blueprints with a single line per blueprint."""
    app.register_blueprint(ai_bp, url_prefix="/api/v1")
