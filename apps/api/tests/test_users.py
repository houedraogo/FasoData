"""Tests des endpoints utilisateurs."""

import pytest


@pytest.mark.asyncio
class TestGetUsers:
    async def test_list_users_admin_only(self, client, admin_token, institutional_token):
        # Admin peut lister
        resp = await client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

        # Institutionnel ne peut pas
        resp2 = await client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp2.status_code == 403

    async def test_list_users_unauthenticated(self, client):
        resp = await client.get("/api/users")
        assert resp.status_code == 401

    async def test_list_users_search(self, client, admin_token, admin_user):
        resp = await client.get(
            f"/api/users?q={admin_user.email}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any(u["email"] == admin_user.email for u in items)


@pytest.mark.asyncio
class TestUpdateMe:
    async def test_update_own_profile(self, client, institutional_token):
        resp = await client.patch(
            "/api/users/me",
            json={"full_name": "Nouveau Nom", "bio": "Ma biographie"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["full_name"] == "Nouveau Nom"
        assert data["bio"] == "Ma biographie"

    async def test_update_own_password(self, client, institutional_user):
        # Login initial
        login = await client.post(
            "/api/auth/login",
            data={"username": institutional_user.email, "password": "Instit1234!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = login.json()["access_token"]

        # Changement de mot de passe
        resp = await client.patch(
            "/api/users/me",
            json={"password": "NouveauMdp123!"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # Connexion avec le nouveau mot de passe
        login2 = await client.post(
            "/api/auth/login",
            data={"username": institutional_user.email, "password": "NouveauMdp123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login2.status_code == 200

    async def test_update_me_unauthenticated(self, client):
        resp = await client.patch("/api/users/me", json={"full_name": "Hack"})
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestAdminUpdateUser:
    async def test_admin_can_deactivate_user(self, client, admin_token, institutional_user):
        resp = await client.patch(
            f"/api/users/{institutional_user.id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    async def test_admin_can_change_role(self, client, admin_token, institutional_user):
        resp = await client.patch(
            f"/api/users/{institutional_user.id}",
            json={"role": "public"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "public"

    async def test_non_admin_cannot_update_user(self, client, institutional_token, admin_user):
        resp = await client.patch(
            f"/api/users/{admin_user.id}",
            json={"role": "public"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 403
