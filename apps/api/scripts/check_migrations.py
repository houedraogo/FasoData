"""Smoke-test Alembic migrations against a temporary PostgreSQL database.

Run from the API container before a VPS migration:

    python scripts/check_migrations.py

The script never migrates the application database directly. It creates a
temporary sibling database, runs ``alembic upgrade head`` twice, checks critical
tables, then drops the temporary database.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from urllib.parse import urlsplit, urlunsplit

import psycopg2


REQUIRED_TABLES = {
    "users",
    "datasets",
    "price_data",
    "alert_subscriptions",
    "alert_rules",
    "programs",
    "program_price_alerts",
    "dashboard_preferences",
    "platform_settings",
    "alembic_version",
}


@dataclass(frozen=True)
class DbUrls:
    admin_sync_url: str
    smoke_sync_url: str
    smoke_async_url: str
    smoke_db_name: str


def _to_sync_url(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


def _with_database(url: str, database: str) -> str:
    parsed = urlsplit(url)
    return urlunsplit((parsed.scheme, parsed.netloc, f"/{database}", parsed.query, parsed.fragment))


def _quote_ident(identifier: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", identifier):
        raise ValueError(f"Unsafe database identifier: {identifier!r}")
    return f'"{identifier}"'


def _build_urls() -> DbUrls:
    database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://fasodata:changeme@db:5432/fasodata")
    smoke_db_name = os.getenv("MIGRATION_SMOKE_DB", f"fasodata_migration_smoke_{int(time.time())}")
    sync_url = _to_sync_url(database_url)
    return DbUrls(
        admin_sync_url=_with_database(sync_url, "postgres"),
        smoke_sync_url=_with_database(sync_url, smoke_db_name),
        smoke_async_url=_with_database(database_url, smoke_db_name),
        smoke_db_name=smoke_db_name,
    )


def _connect(url: str):
    return psycopg2.connect(url)


def _recreate_database(urls: DbUrls) -> None:
    db_ident = _quote_ident(urls.smoke_db_name)
    conn = _connect(urls.admin_sync_url)
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
                (urls.smoke_db_name,),
            )
            cur.execute(f"DROP DATABASE IF EXISTS {db_ident}")
            cur.execute(f"CREATE DATABASE {db_ident}")
    finally:
        conn.close()


def _drop_database(urls: DbUrls) -> None:
    db_ident = _quote_ident(urls.smoke_db_name)
    conn = _connect(urls.admin_sync_url)
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
                (urls.smoke_db_name,),
            )
            cur.execute(f"DROP DATABASE IF EXISTS {db_ident}")
    finally:
        conn.close()


def _run_alembic(urls: DbUrls) -> None:
    env = {**os.environ, "DATABASE_URL": urls.smoke_async_url}
    subprocess.run(["alembic", "-c", "alembic.ini", "upgrade", "head"], check=True, env=env)


def _verify_schema(urls: DbUrls) -> None:
    with _connect(urls.smoke_sync_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT version_num FROM alembic_version")
            version = cur.fetchone()[0]
            if version != "0003":
                raise RuntimeError(f"Unexpected Alembic version: {version}")

            cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            tables = {row[0] for row in cur.fetchall()}
            missing = sorted(REQUIRED_TABLES - tables)
            if missing:
                raise RuntimeError(f"Missing tables after migration: {', '.join(missing)}")


def main() -> int:
    urls = _build_urls()
    print(f"[migration-smoke] Temporary database: {urls.smoke_db_name}")
    try:
        _recreate_database(urls)
        print("[migration-smoke] Running alembic upgrade head")
        _run_alembic(urls)
        _verify_schema(urls)
        print("[migration-smoke] Re-running upgrade head for idempotence")
        _run_alembic(urls)
        _verify_schema(urls)
        print("[migration-smoke] OK")
        return 0
    finally:
        if os.getenv("MIGRATION_SMOKE_KEEP_DB") == "1":
            print(f"[migration-smoke] Keeping database {urls.smoke_db_name}")
        else:
            _drop_database(urls)
            print("[migration-smoke] Temporary database dropped")


if __name__ == "__main__":
    sys.exit(main())
