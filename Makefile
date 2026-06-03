.PHONY: help dev up prod-up prod-down prod-logs init-letsencrypt down build logs ps shell-api shell-web migrate seed test lint

COMPOSE = docker compose -f infra/compose.yaml
COMPOSE_PROD = docker compose -f infra/compose.yaml -f infra/compose.prod.yaml
API_SVC = api
WEB_SVC = web

help: ## Afficher l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Démarrage ───────────────────────────────────────────────────────────────
dev: ## Démarrer en mode développement (avec hot-reload)
	cp -n .env.example .env 2>/dev/null || true
	$(COMPOSE) up --build

up: ## Démarrer en arrière-plan
	$(COMPOSE) up -d

prod-up: ## Demarrer la stack production HTTPS
	$(COMPOSE_PROD) up -d --build

prod-down: ## Arreter la stack production
	$(COMPOSE_PROD) down

prod-logs: ## Voir les logs production
	$(COMPOSE_PROD) logs -f

init-letsencrypt: ## Initialiser HTTPS Let's Encrypt sur le VPS
	sh scripts/init-letsencrypt.sh

down: ## Arrêter tous les services
	$(COMPOSE) down

build: ## Rebuild les images Docker
	$(COMPOSE) build --no-cache

restart: ## Redémarrer un service (ex: make restart svc=api)
	$(COMPOSE) restart $(svc)

# ─── Logs ────────────────────────────────────────────────────────────────────
logs: ## Voir tous les logs
	$(COMPOSE) logs -f

logs-api: ## Voir les logs de l'API
	$(COMPOSE) logs -f $(API_SVC)

logs-web: ## Voir les logs du frontend
	$(COMPOSE) logs -f $(WEB_SVC)

ps: ## Statut des services
	$(COMPOSE) ps

# ─── Shells ──────────────────────────────────────────────────────────────────
shell-api: ## Shell dans le conteneur API
	$(COMPOSE) exec $(API_SVC) bash

shell-web: ## Shell dans le conteneur Web
	$(COMPOSE) exec $(WEB_SVC) sh

shell-db: ## psql dans PostgreSQL
	$(COMPOSE) exec db psql -U fasodata -d fasodata

# ─── Base de données ─────────────────────────────────────────────────────────
migrate: ## Appliquer les migrations Alembic
	$(COMPOSE) exec $(API_SVC) alembic upgrade head

migrate-create: ## Créer une migration (ex: make migrate-create msg="add users table")
	$(COMPOSE) exec $(API_SVC) alembic revision --autogenerate -m "$(msg)"

migrate-down: ## Annuler la dernière migration
	$(COMPOSE) exec $(API_SVC) alembic downgrade -1

seed: ## Peupler la base avec des données de démo
	$(COMPOSE) exec $(API_SVC) python scripts/seed_admin.py
	$(COMPOSE) exec $(API_SVC) python scripts/seed_demo.py

# ─── Tests ───────────────────────────────────────────────────────────────────
test: ## Lancer les tests API
	$(COMPOSE) exec $(API_SVC) pytest tests/ -v

test-cov: ## Tests avec couverture
	$(COMPOSE) exec $(API_SVC) pytest tests/ -v --cov=fasodata --cov-report=html

# ─── Qualité de code ─────────────────────────────────────────────────────────
lint: ## Lint Python + TypeScript
	$(COMPOSE) exec $(API_SVC) ruff check fasodata/
	$(COMPOSE) exec $(WEB_SVC) npm run lint

format: ## Formater le code
	$(COMPOSE) exec $(API_SVC) ruff format fasodata/
	$(COMPOSE) exec $(API_SVC) black fasodata/

# ─── Nettoyage ───────────────────────────────────────────────────────────────
clean: ## Supprimer les conteneurs et volumes (DANGER)
	$(COMPOSE) down -v --remove-orphans

reset-db: ## Remettre à zéro la base de données (DANGER)
	$(COMPOSE) exec db psql -U fasodata -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	$(MAKE) migrate
	$(MAKE) seed
