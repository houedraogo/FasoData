"""Helpers for separating real data from seed/simulation data."""

from __future__ import annotations

from sqlalchemy import ColumnElement

from fasodata.core.config import Settings, get_settings


PUBLIC_ORIGINS = ("public", "field", "user_upload", "manual")
NON_PRODUCTION_ORIGINS = ("seed", "simulation")


def is_production(settings: Settings | None = None) -> bool:
    current = settings or get_settings()
    return current.environment.lower() == "production"


def visible_origin_filter(column: ColumnElement, settings: Settings | None = None):
    """Return a SQLAlchemy filter that hides seed/simulation rows in production."""
    if not is_production(settings):
        return None
    return column.in_(PUBLIC_ORIGINS)
