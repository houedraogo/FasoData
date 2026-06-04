"""Initial schema — toutes les tables FasoData

Revision ID: 0001
Revises:
Create Date: 2026-06-04

NOTES
-----
Cette migration est IDEMPOTENTE : elle utilise CREATE TABLE IF NOT EXISTS
et des blocs DO $$ ... EXCEPTION WHEN duplicate_object ... $$ pour les
types ENUM.  Elle peut être appliquée sur un VPS qui a déjà des tables
(créées via create_all) sans aucun risque.

Sur un VPS existant sans Alembic :
    alembic upgrade head     ← applique la migration (IF NOT EXISTS = rien)
    alembic current          ← doit afficher 0001

Sur un VPS vierge :
    alembic upgrade head     ← crée tout de zéro
"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _create_enum(name: str, *values: str) -> None:
    """Crée un type ENUM PostgreSQL, sans erreur si déjà existant."""
    vals = ", ".join(f"'{v}'" for v in values)
    op.execute(f"""
        DO $$ BEGIN
            CREATE TYPE {name} AS ENUM ({vals});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)


# ── Upgrade ───────────────────────────────────────────────────────────────────

def upgrade() -> None:

    # ── 1. Types ENUM ─────────────────────────────────────────────────────────

    _create_enum("userrole", "admin", "institutional", "public")
    _create_enum("datasetstatus", "draft", "pending", "published", "archived")
    _create_enum("datasetlicense", "open", "cc-by", "cc-by-sa", "cc-by-nc", "proprietary")
    _create_enum("alertseverity", "info", "warning", "critical")
    _create_enum("alertrulestatus", "active", "paused")
    _create_enum("metricstatus", "ok", "warn", "down")
    _create_enum("teammemberstatus", "active", "invited", "suspended")
    _create_enum("qualitycheckstatus", "pending", "running", "completed", "failed")
    _create_enum("qualityissueseverity", "low", "medium", "high", "critical")
    _create_enum("programstatus", "active", "paused", "archived")

    # ── 2. Table users ────────────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            email           VARCHAR(255) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            full_name       VARCHAR(255),
            organization    VARCHAR(255),
            role            userrole    NOT NULL DEFAULT 'public',
            is_active       BOOLEAN     NOT NULL DEFAULT true,
            is_verified     BOOLEAN     NOT NULL DEFAULT false,
            bio             TEXT,
            avatar_url      VARCHAR(512),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_id ON users(id)")

    # ── 3. Table datasets ─────────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS datasets (
            id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            slug             VARCHAR(255) NOT NULL,
            name             VARCHAR(255) NOT NULL,
            description      TEXT,
            category         VARCHAR(100),
            tags             JSONB        NOT NULL DEFAULT '[]'::jsonb,
            source           VARCHAR(255),
            license          datasetlicense NOT NULL DEFAULT 'open',
            status           datasetstatus  NOT NULL DEFAULT 'draft',
            is_geo           BOOLEAN      NOT NULL DEFAULT false,
            s3_key           VARCHAR(512),
            file_format      VARCHAR(20),
            file_size_bytes  INTEGER,
            row_count        INTEGER,
            columns_meta     JSONB,
            download_count   INTEGER      NOT NULL DEFAULT 0,
            view_count       INTEGER      NOT NULL DEFAULT 0,
            owner_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
            created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
            published_at     TIMESTAMPTZ
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_datasets_slug ON datasets(slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_datasets_id ON datasets(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_datasets_category ON datasets(category)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_datasets_status ON datasets(status)")

    # ── 4. Table import_jobs ──────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS import_jobs (
            id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            dataset_id     UUID        NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
            celery_task_id VARCHAR(255),
            status         VARCHAR(20) NOT NULL DEFAULT 'queued',
            progress       INTEGER     NOT NULL DEFAULT 0,
            error_message  TEXT,
            rows_imported  INTEGER     NOT NULL DEFAULT 0,
            started_at     TIMESTAMPTZ,
            finished_at    TIMESTAMPTZ,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # ── 5. Table price_data ───────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS price_data (
            id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            country           VARCHAR(3)  NOT NULL DEFAULT 'BFA',
            commodity         VARCHAR(50) NOT NULL,
            region            VARCHAR(100) NOT NULL DEFAULT 'National',
            market            VARCHAR(200),
            price             DOUBLE PRECISION NOT NULL,
            unit              VARCHAR(20) NOT NULL DEFAULT 'CFA/kg',
            quality           VARCHAR(50),
            price_date        DATE        NOT NULL,
            source            VARCHAR(50) NOT NULL DEFAULT 'manual',
            reporter          VARCHAR(100),
            n_obs             INTEGER     NOT NULL DEFAULT 1,
            notes             VARCHAR(500),
            validation_status VARCHAR(20) NOT NULL DEFAULT 'auto',
            validated_by      VARCHAR(100),
            validated_at      TIMESTAMPTZ,
            anomaly_score     INTEGER,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_data_id ON price_data(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_data_commodity ON price_data(commodity)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_data_region ON price_data(region)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_data_country ON price_data(country)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_data_price_date ON price_data(price_date)")

    # ── 6. Table alert_subscriptions ─────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS alert_subscriptions (
            id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            email               VARCHAR(255) NOT NULL,
            whatsapp_number     VARCHAR(30),
            commodity           VARCHAR(50)  NOT NULL,
            region              VARCHAR(100) NOT NULL DEFAULT 'National',
            threshold_price     DOUBLE PRECISION NOT NULL,
            is_active           BOOLEAN      NOT NULL DEFAULT false,
            is_confirmed        BOOLEAN      NOT NULL DEFAULT false,
            token               VARCHAR(64)  NOT NULL,
            last_alerted_at     TIMESTAMPTZ,
            last_price_alerted  DOUBLE PRECISION,
            alert_count         INTEGER      NOT NULL DEFAULT 0,
            created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
            confirmed_at        TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_subscriptions_email    ON alert_subscriptions(email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_subscriptions_whatsapp ON alert_subscriptions(whatsapp_number)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_subscriptions_token ON alert_subscriptions(token)")

    # ── 7. Table alert_rules ──────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS alert_rules (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            name            VARCHAR(255) NOT NULL,
            metric_key      VARCHAR(120) NOT NULL,
            comparator      VARCHAR(10)  NOT NULL,
            threshold_value DOUBLE PRECISION NOT NULL,
            unit            VARCHAR(40),
            region          VARCHAR(120),
            channels        JSONB        NOT NULL DEFAULT '[]'::jsonb,
            severity        alertseverity  NOT NULL DEFAULT 'warning',
            status          alertrulestatus NOT NULL DEFAULT 'active',
            created_by_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_rules_metric_key ON alert_rules(metric_key)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_rules_region ON alert_rules(region)")

    # ── 8. Table system_metrics ───────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS system_metrics (
            id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            service      VARCHAR(120) NOT NULL,
            metric_key   VARCHAR(120) NOT NULL,
            label        VARCHAR(255) NOT NULL,
            value        DOUBLE PRECISION NOT NULL,
            unit         VARCHAR(40),
            status       metricstatus NOT NULL DEFAULT 'ok',
            metadata_json JSONB,
            recorded_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_metrics_service    ON system_metrics(service)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_metrics_metric_key ON system_metrics(metric_key)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_metrics_recorded_at ON system_metrics(recorded_at)")

    # ── 9. Table team_members ─────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS team_members (
            id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            organization  VARCHAR(255) NOT NULL,
            email         VARCHAR(255) NOT NULL,
            full_name     VARCHAR(255),
            role          VARCHAR(120) NOT NULL,
            access_level  VARCHAR(120) NOT NULL,
            status        teammemberstatus NOT NULL DEFAULT 'invited',
            user_id       UUID         REFERENCES users(id) ON DELETE SET NULL,
            invited_by_id UUID         REFERENCES users(id) ON DELETE SET NULL,
            invited_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
            joined_at     TIMESTAMPTZ,
            is_owner      BOOLEAN      NOT NULL DEFAULT false
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_team_members_organization ON team_members(organization)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_team_members_email ON team_members(email)")

    # ── 10. Table quality_checks ──────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS quality_checks (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            dataset_id      UUID         REFERENCES datasets(id) ON DELETE CASCADE,
            dataset_slug    VARCHAR(255),
            status          qualitycheckstatus NOT NULL DEFAULT 'pending',
            score           INTEGER      NOT NULL DEFAULT 0,
            completeness    INTEGER      NOT NULL DEFAULT 0,
            coherence       INTEGER      NOT NULL DEFAULT 0,
            duplicate_count INTEGER      NOT NULL DEFAULT 0,
            flagged_rows    INTEGER      NOT NULL DEFAULT 0,
            total_rows      INTEGER      NOT NULL DEFAULT 0,
            reviewer_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
            started_at      TIMESTAMPTZ,
            finished_at     TIMESTAMPTZ,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_quality_checks_dataset_id   ON quality_checks(dataset_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_quality_checks_dataset_slug ON quality_checks(dataset_slug)")

    # ── 11. Table quality_issues ──────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS quality_issues (
            id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            check_id    UUID         NOT NULL REFERENCES quality_checks(id) ON DELETE CASCADE,
            line_number INTEGER,
            column_name VARCHAR(120),
            raw_value   TEXT,
            problem     TEXT         NOT NULL,
            suggestion  TEXT,
            severity    qualityissueseverity NOT NULL DEFAULT 'medium',
            is_resolved BOOLEAN      NOT NULL DEFAULT false,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_quality_issues_check_id ON quality_issues(check_id)")

    # ── 12. Table programs ────────────────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS programs (
            id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            name          VARCHAR(255) NOT NULL,
            description   TEXT,
            sector        VARCHAR(120) NOT NULL DEFAULT 'food_prices',
            period        VARCHAR(40)  NOT NULL DEFAULT '12m',
            status        programstatus NOT NULL DEFAULT 'active',
            owner_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
            metadata_json JSONB,
            created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_programs_sector ON programs(sector)")

    # ── 13. Table program_price_alerts ────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS program_price_alerts (
            id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            program_id      UUID         NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            commodity       VARCHAR(80)  NOT NULL,
            region          VARCHAR(120) NOT NULL DEFAULT 'National',
            threshold_price DOUBLE PRECISION NOT NULL,
            current_price   DOUBLE PRECISION,
            is_triggered    BOOLEAN      NOT NULL DEFAULT false,
            channels        JSONB        NOT NULL DEFAULT '[]'::jsonb,
            created_by_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_program_price_alerts_program_id ON program_price_alerts(program_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_program_price_alerts_commodity  ON program_price_alerts(commodity)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_program_price_alerts_region     ON program_price_alerts(region)")

    # ── 14. Table program_scenarios ───────────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS program_scenarios (
            id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            program_id    UUID         NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            name          VARCHAR(255) NOT NULL,
            region_a      VARCHAR(120) NOT NULL,
            region_b      VARCHAR(120) NOT NULL,
            commodity     VARCHAR(80)  NOT NULL DEFAULT 'maize',
            parameters    JSONB,
            created_by_id UUID         REFERENCES users(id) ON DELETE SET NULL,
            created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_program_scenarios_program_id ON program_scenarios(program_id)")

    # ── 15. Table dashboard_preferences ──────────────────────────────────────

    op.execute("""
        CREATE TABLE IF NOT EXISTS dashboard_preferences (
            id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            domains      JSONB   NOT NULL DEFAULT '[]'::jsonb,
            data_types   JSONB   NOT NULL DEFAULT '[]'::jsonb,
            regions      JSONB   NOT NULL DEFAULT '[]'::jsonb,
            is_configured BOOLEAN NOT NULL DEFAULT false,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_preferences_user_id ON dashboard_preferences(user_id)")


# ── Downgrade ─────────────────────────────────────────────────────────────────

def downgrade() -> None:
    # Suppression dans l'ordre inverse des dépendances FK
    op.execute("DROP TABLE IF EXISTS dashboard_preferences CASCADE")
    op.execute("DROP TABLE IF EXISTS program_scenarios CASCADE")
    op.execute("DROP TABLE IF EXISTS program_price_alerts CASCADE")
    op.execute("DROP TABLE IF EXISTS programs CASCADE")
    op.execute("DROP TABLE IF EXISTS quality_issues CASCADE")
    op.execute("DROP TABLE IF EXISTS quality_checks CASCADE")
    op.execute("DROP TABLE IF EXISTS team_members CASCADE")
    op.execute("DROP TABLE IF EXISTS system_metrics CASCADE")
    op.execute("DROP TABLE IF EXISTS alert_rules CASCADE")
    op.execute("DROP TABLE IF EXISTS alert_subscriptions CASCADE")
    op.execute("DROP TABLE IF EXISTS price_data CASCADE")
    op.execute("DROP TABLE IF EXISTS import_jobs CASCADE")
    op.execute("DROP TABLE IF EXISTS datasets CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")

    # Suppression des types ENUM (ordre inverse)
    for enum_name in [
        "programstatus", "qualityissueseverity", "qualitycheckstatus",
        "teammemberstatus", "metricstatus", "alertrulestatus", "alertseverity",
        "datasetstatus", "datasetlicense", "userrole",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
