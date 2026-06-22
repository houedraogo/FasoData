"""Add contributor access requests.

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-15
"""

from alembic import op


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accessrequeststatus') THEN
                CREATE TYPE accessrequeststatus AS ENUM ('pending', 'approved', 'rejected');
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS access_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            hashed_password VARCHAR(255),
            full_name VARCHAR(255),
            organization VARCHAR(255) NOT NULL,
            role userrole NOT NULL DEFAULT 'institutional',
            status accessrequeststatus NOT NULL DEFAULT 'pending',
            reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMPTZ,
            review_note TEXT,
            created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_access_requests_email ON access_requests(email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_access_requests_organization ON access_requests(organization)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_access_requests_status ON access_requests(status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_access_requests_created_at ON access_requests(created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS access_requests CASCADE")
    op.execute("DROP TYPE IF EXISTS accessrequeststatus")
