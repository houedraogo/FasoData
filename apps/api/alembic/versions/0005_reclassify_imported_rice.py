"""Reclassify imported rice public WFP rows.

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-12
"""

from alembic import op


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE price_data
        SET commodity = 'rice_imported'
        WHERE source = 'wfp'
          AND data_origin = 'public'
          AND commodity = 'rice_local'
          AND notes ILIKE '%Rice (imported)%'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE price_data
        SET commodity = 'rice_local'
        WHERE source = 'wfp'
          AND data_origin = 'public'
          AND commodity = 'rice_imported'
          AND notes ILIKE '%Rice (imported)%'
        """
    )
