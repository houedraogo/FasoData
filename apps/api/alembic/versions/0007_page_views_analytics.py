"""Add page views analytics.

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-13
"""

from alembic import op


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS page_views (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            path            VARCHAR(500) NOT NULL,
            title           VARCHAR(255),
            referrer        VARCHAR(1000),
            referrer_domain VARCHAR(255),
            visitor_id      VARCHAR(120),
            session_id      VARCHAR(120),
            ip_hash         VARCHAR(128),
            user_agent      VARCHAR(500),
            user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_path ON page_views(path)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_referrer_domain ON page_views(referrer_domain)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_visitor_id ON page_views(visitor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_session_id ON page_views(session_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_ip_hash ON page_views(ip_hash)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_user_id ON page_views(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_page_views_created_at ON page_views(created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS page_views CASCADE")
