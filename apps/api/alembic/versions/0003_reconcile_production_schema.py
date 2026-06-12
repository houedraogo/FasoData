"""Reconcile production schema with SQLAlchemy models

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "price_data",
        "country",
        existing_type=sa.String(length=3),
        existing_server_default=sa.text("'BFA'::character varying"),
        nullable=False,
    )
    op.alter_column(
        "price_data",
        "validation_status",
        existing_type=sa.String(length=20),
        existing_server_default=sa.text("'auto'::character varying"),
        nullable=False,
    )

    op.execute("DROP INDEX IF EXISTS ix_alert_subscriptions_whatsapp")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_alert_subscriptions_whatsapp_number "
        "ON alert_subscriptions (whatsapp_number)"
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'alert_subscriptions_token_key'
                  AND conrelid = 'alert_subscriptions'::regclass
            ) THEN
                ALTER TABLE alert_subscriptions
                ADD CONSTRAINT alert_subscriptions_token_key UNIQUE (token);
            END IF;
        END $$;
        """
    )
    op.execute("DROP INDEX IF EXISTS uq_alert_subscriptions_token")

    # Primary keys are already indexed by PostgreSQL; remove duplicate indexes
    # created by the legacy bootstrap migration.
    op.execute("DROP INDEX IF EXISTS ix_users_id")
    op.execute("DROP INDEX IF EXISTS ix_datasets_id")
    op.execute("DROP INDEX IF EXISTS ix_price_data_id")


def downgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_datasets_id ON datasets (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_data_id ON price_data (id)")

    op.execute("DROP INDEX IF EXISTS ix_alert_subscriptions_whatsapp_number")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_alert_subscriptions_whatsapp "
        "ON alert_subscriptions (whatsapp_number)"
    )
    op.execute("ALTER TABLE alert_subscriptions DROP CONSTRAINT IF EXISTS alert_subscriptions_token_key")
    op.execute("DROP INDEX IF EXISTS uq_alert_subscriptions_token")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_subscriptions_token "
        "ON alert_subscriptions (token)"
    )

    op.alter_column(
        "price_data",
        "validation_status",
        existing_type=sa.String(length=20),
        existing_server_default=sa.text("'auto'::character varying"),
        nullable=True,
    )
    op.alter_column(
        "price_data",
        "country",
        existing_type=sa.String(length=3),
        existing_server_default=sa.text("'BFA'::character varying"),
        nullable=True,
    )
