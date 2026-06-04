"""Configuration des tests FasoData — PostgreSQL fasodata_test."""

import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from sqlalchemy import text

from fasodata.main import app
from fasodata.core.database import Base, get_db
from fasodata.core.security import hash_password
from fasodata.users.models import User, UserRole

TEST_DB_URL = "postgresql+asyncpg://fasodata:changeme_db@db:5432/fasodata_test"


# ── Event loop session-scoped ─────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Moteur + schéma ───────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)

    # Créer toutes les tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Nettoyer à la fin de la session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


# ── Session DB par test ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def db_session(test_engine):
    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as session:
        yield session
        # Nettoyage dans l'ordre FK : enfants d'abord, parents ensuite
        await session.rollback()
        await session.execute(text("DELETE FROM program_scenarios"))
        await session.execute(text("DELETE FROM program_price_alerts"))
        await session.execute(text("DELETE FROM programs"))
        await session.execute(text("DELETE FROM dashboard_preferences"))
        await session.execute(text("DELETE FROM alert_rules"))
        await session.execute(text("DELETE FROM import_jobs"))
        await session.execute(text("DELETE FROM price_data"))
        await session.execute(text("DELETE FROM alert_subscriptions"))
        await session.execute(text("DELETE FROM datasets"))
        await session.execute(text("DELETE FROM users"))
        await session.commit()


# ── Client HTTP ───────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Utilisateurs de test ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_user(db_session):
    user = User(
        email="admin@test.bf",
        hashed_password=hash_password("Admin1234!"),
        full_name="Admin Test",
        role=UserRole.admin,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def institutional_user(db_session):
    user = User(
        email="institution@test.bf",
        hashed_password=hash_password("Instit1234!"),
        full_name="ONG Test",
        organization="ONG Burkina",
        role=UserRole.institutional,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


# ── Tokens ────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_token(client, admin_user):
    resp = await client.post(
        "/api/auth/login",
        data={"username": admin_user.email, "password": "Admin1234!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def institutional_token(client, institutional_user):
    resp = await client.post(
        "/api/auth/login",
        data={"username": institutional_user.email, "password": "Instit1234!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
