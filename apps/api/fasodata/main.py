import logging
import os
import subprocess
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from fasodata.analytics.router import router as analytics_router
from fasodata.auth.router import router as auth_router
from fasodata.core.config import get_settings
from fasodata.datasets.router import router as datasets_router
from fasodata.dashboard.router import router as dashboard_router
from fasodata.geo.router import router as geo_router
from fasodata.alerts.router import router as alerts_router
from fasodata.prices.router import router as prices_router
from fasodata.prices import at_service
from fasodata.reports.router import router as reports_router
from fasodata.search.router import router as search_router
from fasodata.users.router import router as users_router

logger   = logging.getLogger(__name__)
settings = get_settings()


def _run_migrations() -> None:
    """
    Applique les migrations Alembic via subprocess.

    On utilise subprocess (et non alembic_command.upgrade()) car
    env.py utilise asyncio.run() — incompatible avec la boucle asyncio
    déjà active dans le lifespan FastAPI.
    """
    alembic_ini = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    )
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", alembic_ini, "upgrade", "head"],
        capture_output=True,
        text=True,
        cwd=os.path.dirname(alembic_ini),   # /app
    )
    if result.stdout:
        logger.info(result.stdout.strip())
    if result.stderr:
        logger.warning(result.stderr.strip())
    if result.returncode != 0:
        raise RuntimeError(
            f"Alembic migration échouée (exit {result.returncode})"
        )
    logger.info("✅ Migrations Alembic appliquées avec succès")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Migrations Alembic — subprocess pour éviter le conflit asyncio
    _run_migrations()
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
app.include_router(analytics_router)
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
