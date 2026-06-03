"""Tests des endpoints d'authentification."""

import pytest


@pytest.mark.asyncio
class TestRegister:
    async def test_register_public_user(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "citoyen@test.bf",
            "password": "Citoyen123!",
            "full_name": "Citoyen Test",
            "role": "public",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "citoyen@test.bf"
        assert data["role"] == "public"
        assert "hashed_password" not in data

    async def test_register_institutional_user(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "ong@test.bf",
            "password": "ONG1234!",
            "full_name": "ONG Sahel",
            "organization": "ONG Sahel Actions",
            "role": "institutional",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "institutional"
        assert data["organization"] == "ONG Sahel Actions"

    async def test_register_duplicate_email(self, client):
        payload = {"email": "dupe@test.bf", "password": "Dupe1234!", "role": "public"}
        await client.post("/api/auth/register", json=payload)
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409
        assert "Email" in resp.json()["detail"]

    async def test_register_invalid_email(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "pas-un-email",
            "password": "Test1234!",
        })
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client, institutional_user):
        resp = await client.post(
            "/api/auth/login",
            data={"username": institutional_user.email, "password": "Instit1234!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client, institutional_user):
        resp = await client.post(
            "/api/auth/login",
            data={"username": institutional_user.email, "password": "mauvais"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 401

    async def test_login_unknown_email(self, client):
        resp = await client.post(
            "/api/auth/login",
            data={"username": "inconnu@test.bf", "password": "Test1234!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestMe:
    async def test_get_me_authenticated(self, client, institutional_token, institutional_user):
        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == institutional_user.email
        assert data["role"] == "institutional"

    async def test_get_me_unauthenticated(self, client):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    async def test_get_me_invalid_token(self, client):
        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer token_invalide"},
        )
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestRefreshToken:
    async def test_refresh_success(self, client, institutional_user):
        # Login pour obtenir les tokens
        login = await client.post(
            "/api/auth/login",
            data={"username": institutional_user.email, "password": "Instit1234!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        refresh_token = login.json()["refresh_token"]

        resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_refresh_invalid_token(self, client):
        resp = await client.post("/api/auth/refresh", json={"refresh_token": "invalid"})
        assert resp.status_code == 401
