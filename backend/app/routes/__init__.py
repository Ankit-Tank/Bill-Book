from flask import Flask
from .health import health_bp
from .parties import parties_bp
from .transactions import transactions_bp
from .dashboard import dashboard_bp
from .ai import ai_bp
from .credit import credit_bp
from .reports import reports_bp


def register_routes(app: Flask) -> None:
    """Register all route blueprints with a single line per route file."""
    app.register_blueprint(health_bp)
    app.register_blueprint(parties_bp, url_prefix="/api/v1")
    app.register_blueprint(transactions_bp, url_prefix="/api/v1")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1")
    app.register_blueprint(ai_bp, url_prefix="/api/v1")
    app.register_blueprint(credit_bp, url_prefix="/api/v1")
    app.register_blueprint(reports_bp, url_prefix="/api/v1")


