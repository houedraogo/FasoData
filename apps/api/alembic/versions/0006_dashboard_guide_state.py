"""Add dashboard guide state to preferences.

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-13
"""

from alembic import op


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE dashboard_preferences
        ADD COLUMN IF NOT EXISTS guide_dismissed BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE dashboard_preferences
        DROP COLUMN IF EXISTS guide_dismissed
        """
    )
