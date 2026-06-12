# Production HTTPS / Let's Encrypt

This setup runs FasoData behind Nginx with automatic Let's Encrypt certificates.

## Prerequisites

- A VPS with Docker and Docker Compose.
- DNS A/AAAA records pointing to the VPS:
  - `APP_DOMAIN`, for example `fasodata.bf`
  - `DEVELOPERS_DOMAIN`, for example `developers.fasodata.bf`
- Ports `80` and `443` open on the VPS firewall.

## First deployment

```sh
cp .env.prod.example .env.prod
vi .env.prod
```

Change all secrets and set:

```env
APP_DOMAIN=fasodata.bf
DEVELOPERS_DOMAIN=developers.fasodata.bf
LETSENCRYPT_EMAIL=admin@fasodata.bf
NEXT_PUBLIC_API_URL=https://fasodata.bf/api
CORS_ORIGINS=https://fasodata.bf,https://developers.fasodata.bf
```

For a dry run against Let's Encrypt staging:

```env
LETSENCRYPT_STAGING=true
```

Then initialize certificates:

```sh
make init-letsencrypt
```

Start or update production:

```sh
make prod-up
```

## Database migration smoke test

Before migrating a VPS database, run the Alembic smoke test from the API
container. It creates a temporary sibling PostgreSQL database, runs
`alembic upgrade head`, verifies critical tables, runs `upgrade head` again for
idempotence, then drops the temporary database.

```sh
docker compose -f infra/compose.yaml -f infra/compose.prod.yaml exec api \
  python scripts/check_migrations.py
```

Useful options:

```sh
MIGRATION_SMOKE_DB=fasodata_migration_smoke python scripts/check_migrations.py
MIGRATION_SMOKE_KEEP_DB=1 python scripts/check_migrations.py
```

The production application database is not migrated by this script. It uses
`DATABASE_URL` only to derive credentials/host and creates a separate temporary
database.

## Application bootstraps

FasoData intentionally creates a few system resources at runtime so a fresh
deployment is immediately usable:

- Public price dataset: `/api/datasets` ensures
  `prix-alimentaires-burkina-faso` exists and exposes live `price_data` rows as
  a catalogue dataset.
- Default food prices program: dashboard endpoints ensure the
  `Suivi des prix alimentaires` program exists with `metadata_json.default=true`.
- Dashboard preferences: first access creates default user preferences
  (`prices`, `time_series`, `maps`, `National`).

These bootstraps must stay idempotent. Do not delete them during production
migrations unless an explicit seed/migration replaces the same behavior.

## Renewal

The `certbot` service renews certificates every 12 hours. Nginx reloads periodically to pick up renewed certificates. You can also reload it manually after a renewal:

```sh
docker compose -f infra/compose.yaml -f infra/compose.prod.yaml exec nginx nginx -s reload
```

## Useful checks

```sh
curl -I https://fasodata.bf/api/health
curl -I https://developers.fasodata.bf
docker compose -f infra/compose.yaml -f infra/compose.prod.yaml logs -f nginx certbot
```
