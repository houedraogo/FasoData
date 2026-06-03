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
