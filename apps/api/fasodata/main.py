from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from fasodata.auth.router import router as auth_router
from sqlalchemy import text

from fasodata.core.config import get_settings
from fasodata.core.database import Base, engine
from fasodata.datasets.router import router as datasets_router
from fasodata.dashboard.router import router as dashboard_router
from fasodata.geo.router import router as geo_router
from fasodata.alerts.router import router as alerts_router
from fasodata.prices.router import router as prices_router
from fasodata.prices import at_service
from fasodata.reports.router import router as reports_router
from fasodata.search.router import router as search_router
from fasodata.users.router import router as users_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Créer les tables au démarrage (remplacé par Alembic en prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrations additives idempotentes (ADD COLUMN IF NOT EXISTS)
        for stmt in [
            # price_data
            "ALTER TABLE price_data ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'auto'",
            "ALTER TABLE price_data ADD COLUMN IF NOT EXISTS validated_by  VARCHAR(100)",
            "ALTER TABLE price_data ADD COLUMN IF NOT EXISTS validated_at  TIMESTAMPTZ",
            "ALTER TABLE price_data ADD COLUMN IF NOT EXISTS anomaly_score INTEGER",
            "ALTER TABLE price_data ADD COLUMN IF NOT EXISTS country VARCHAR(3) DEFAULT 'BFA'",
            # alert_subscriptions
            "ALTER TABLE alert_subscriptions ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30)",
        ]:
            await conn.execute(text(stmt))
    # Initialiser Africa's Talking SMS
    at_service.initialize(settings.at_username, settings.at_api_key)
    yield


app = FastAPI(
    title="FasoData API",
    description="Plateforme de données ouvertes pour le Burkina Faso",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/api/metrics")

# Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(datasets_router)
app.include_router(dashboard_router)
app.include_router(search_router)
app.include_router(geo_router)
app.include_router(alerts_router)
app.include_router(prices_router)
app.include_router(reports_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "FasoData API", "version": "1.0.0"}
