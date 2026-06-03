#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.prod"
COMPOSE="docker compose -f infra/compose.yaml -f infra/compose.prod.yaml"
INIT_COMPOSE="$COMPOSE -f infra/compose.certbot-init.yaml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env.prod. Copy .env.prod.example to .env.prod and edit domains/secrets first."
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ -z "${APP_DOMAIN:-}" ] || [ -z "${LETSENCRYPT_EMAIL:-}" ]; then
  echo "APP_DOMAIN and LETSENCRYPT_EMAIL are required in .env.prod."
  exit 1
fi

DOMAINS="-d $APP_DOMAIN"
if [ -n "${DEVELOPERS_DOMAIN:-}" ]; then
  DOMAINS="$DOMAINS -d $DEVELOPERS_DOMAIN"
fi

STAGING_ARG=""
if [ "${LETSENCRYPT_STAGING:-false}" = "true" ]; then
  STAGING_ARG="--staging"
fi

cd "$ROOT_DIR"
mkdir -p infra/certbot/www infra/certbot/conf

echo "Starting HTTP bootstrap Nginx for ACME challenge..."
$INIT_COMPOSE up -d nginx

echo "Requesting Let's Encrypt certificate for: $DOMAINS"
# shellcheck disable=SC2086
$COMPOSE run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_ARG \
  $DOMAINS

echo "Switching Nginx to HTTPS configuration..."
$COMPOSE up -d nginx certbot
$COMPOSE exec nginx nginx -s reload

echo "HTTPS is ready for $APP_DOMAIN."
