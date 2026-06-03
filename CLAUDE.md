# FasoData — Guide de développement

## Démarrage rapide

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env

# 2. Lancer tous les services
make dev

# 3. (Autre terminal) Créer l'admin et les données de démo
make seed
```

La plateforme est accessible sur **http://localhost**

## URLs utiles (développement)

| Service | URL | Identifiants |
|---------|-----|--------------|
| Portail public | http://localhost | — |
| API FastAPI (docs) | http://localhost/docs | — |
| Admin FasoData | http://localhost/admin | admin@fasodata.bf / changeme_admin |
| Espace institutionnel | http://localhost/dashboard | demo@ong.bf / demo1234 |
| Console MinIO | http://localhost:9001 | fasodata / changeme_minio |
| Grafana | http://localhost:3001 | admin / admin |

## Architecture

```
fasodata/
├── apps/
│   ├── api/          # FastAPI (Python 3.11)
│   │   ├── fasodata/
│   │   │   ├── core/      # config, db, security, celery
│   │   │   ├── auth/      # JWT, login, register
│   │   │   ├── users/     # modèle User, endpoints
│   │   │   ├── datasets/  # modèles Dataset/ImportJob, endpoints
│   │   │   ├── ingest/    # tâches Celery d'import CSV/XLSX
│   │   │   ├── geo/       # endpoints géospatiaux (PostGIS)
│   │   │   ├── search/    # Meilisearch
│   │   │   └── reports/   # export CSV, Celery
│   │   └── scripts/       # seed_admin.py, seed_demo.py
│   └── web/          # Next.js 15 (TypeScript)
│       └── src/
│           ├── app/
│           │   ├── (public)/   # Portail open data (sans auth)
│           │   ├── (institutional)/  # Espace connecté
│           │   ├── admin/      # Back-office admin
│           │   └── auth/       # Connexion / inscription
│           ├── components/
│           │   ├── layout/    # Navbar, Footer, Sidebars
│           │   └── maps/      # Carte Leaflet
│           ├── hooks/         # useAuth (Zustand)
│           └── lib/           # api.ts (axios), utils.ts
├── infra/
│   ├── compose.yaml   # Docker Compose complet
│   └── docker/        # Dockerfiles, nginx.conf
├── Makefile           # Commandes de développement
└── .env.example       # Variables d'environnement
```

## Commandes utiles

```bash
make dev              # Démarrer en mode dev (hot-reload)
make up               # Démarrer en arrière-plan
make down             # Arrêter
make logs-api         # Logs de l'API
make shell-api        # Shell dans le conteneur API
make migrate          # Appliquer les migrations Alembic
make migrate-create msg="ma migration"  # Nouvelle migration
make seed             # Données admin + démo
make test             # Tests pytest
```

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `public` | Lecture seule des datasets publiés |
| `institutional` | Import, analyse, rapports, gestion de ses datasets |
| `admin` | Tout + gestion utilisateurs, modération globale |

## API REST

Documentation complète : http://localhost/docs (Swagger UI)

Endpoints principaux :
- `POST /api/auth/register` — Inscription
- `POST /api/auth/login` — Connexion → JWT
- `GET /api/datasets` — Liste des datasets (public)
- `POST /api/datasets` — Créer un dataset (institutional+)
- `POST /api/datasets/{slug}/upload` — Importer un CSV/XLSX
- `GET /api/search?q=...` — Recherche full-text
- `GET /api/geo/{id}/bbox` — Données géospatiales
- `GET /api/users` — Liste des utilisateurs (admin)

## Ajouter une fonctionnalité

1. Créer le modèle SQLAlchemy dans `apps/api/fasodata/<module>/models.py`
2. Créer les schémas Pydantic dans `schemas.py`
3. Créer les endpoints dans `router.py`
4. Enregistrer le router dans `fasodata/main.py`
5. Créer la page Next.js dans `apps/web/src/app/`

## Déploiement VPS

```bash
# Sur le serveur
git clone <repo> && cd fasodata
cp .env.example .env
# Éditer .env avec les vraies valeurs
docker compose -f infra/compose.yaml up -d
docker compose -f infra/compose.yaml exec api python scripts/seed_admin.py
```

Pour HTTPS, ajouter Certbot/Let's Encrypt devant Nginx.
