"""Add data origin markers

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("price_data", sa.Column("data_origin", sa.String(length=30), nullable=True))
    op.add_column("datasets", sa.Column("data_origin", sa.String(length=30), nullable=True))

    op.execute(
        """
        UPDATE price_data
        SET data_origin = CASE
            WHEN source = 'wfp' AND reporter IS NOT NULL THEN 'public'
            WHEN source IN ('sms', 'whatsapp', 'aggregated') THEN 'field'
            WHEN source = 'manual' THEN 'manual'
            ELSE 'seed'
        END
        WHERE data_origin IS NULL
        """
    )
    op.execute(
        """
        UPDATE datasets
        SET data_origin = CASE
            WHEN slug = 'prix-alimentaires-burkina-faso' THEN 'public'
            WHEN slug IN (
                'prix-cereales-2024',
                'centres-sante-burkina',
                'effectifs-scolaires-2023-2024',
                'pluviometrie-2024'
            ) THEN 'seed'
            ELSE 'user_upload'
        END
        WHERE data_origin IS NULL
        """
    )

    op.alter_column(
        "price_data",
        "data_origin",
        existing_type=sa.String(length=30),
        nullable=False,
        server_default="manual",
    )
    op.alter_column(
        "datasets",
        "data_origin",
        existing_type=sa.String(length=30),
        nullable=False,
        server_default="user_upload",
    )
    op.create_index("ix_price_data_data_origin", "price_data", ["data_origin"], unique=False)
    op.create_index("ix_datasets_data_origin", "datasets", ["data_origin"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_datasets_data_origin", table_name="datasets")
    op.drop_index("ix_price_data_data_origin", table_name="price_data")
    op.drop_column("datasets", "data_origin")
    op.drop_column("price_data", "data_origin")
