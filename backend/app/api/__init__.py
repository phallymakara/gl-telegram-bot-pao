"""
API package entrypoint re-exporting app and router for backward compatibility.
"""

from app.api.main import app
from app.api.router import api_router

__all__ = ["app", "api_router"]
