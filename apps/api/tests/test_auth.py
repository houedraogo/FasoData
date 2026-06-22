"""Tests des endpoints d'authentification."""

import pytest


@pytest.mark.asyncio
class TestRegister:
    async def test_register_public_user_is_disabled(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "citoyen@test.bf",
            "password": "Citoyen123!",
            "full_name": "Citoyen Test",
            "role": "public",
        })
        assert resp.status_code == 403
        assert "compte public" in resp.json()["detail"]

    async def test_register_institutional_user_creates_pending_request(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "ong@test.bf",
            "password": "ONG1234!",
            "full_name": "ONG Sahel",
            "organization": "ONG Sahel Actions",
            "role": "institutional",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "ong@test.bf"
        assert data["role"] == "institutional"
        assert data["organization"] == "ONG Sahel Actions"
        assert data["status"] == "pending"

    async def test_register_duplicate_email(self, client):
        payload = {
            "email": "dupe@test.bf",
            "password": "Dupe1234!",
            "organization": "ONG Dupe",
            "role": "institutional",
        }
        await client.post("/api/auth/register", json=payload)
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409
        assert "demande" in resp.json()["detail"]

    async def test_register_invalid_email(self, client):
        resp = await client.post("/api/auth/register", json={
            "email": "pas-un-email",
            "password": "Test1234!",
        })
        assert resp.status_code == 422

    async def test_admin_approves_access_request(self, client, admin_token):
        create = await client.post("/api/auth/register", json={
            "email": "approve@test.bf",
            "password": "Approve123!",
            "full_name": "Approve Test",
            "organization": "ONG Approval",
            "role": "institutional",
        })
        assert create.status_code == 201
        request_id = create.json()["id"]

        approved = await client.post(
            f"/api/users/access-requests/{request_id}/approve",
            json={"note": "OK"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert approved.status_code == 200
        assert approved.json()["email"] == "approve@test.bf"

        login = await client.post(
            "/api/auth/login",
            data={"username": "approve@test.bf", "password": "Approve123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login.status_code == 200

    async def test_admin_approval_email_uses_app_base_url(self, client, admin_token, monkeypatch):
        sent: list[dict] = []

        def fake_send(**kwargs):
            sent.append(kwargs)
            return True

        from fasodata.users import router as users_router

        monkeypatch.setattr(users_router, "_send", fake_send)
        monkeypatch.setattr(users_router.settings, "app_base_url", "https://app.fasodata.test")

        create = await client.post("/api/auth/register", json={
            "email": "email-approve@test.bf",
            "password": "Approve123!",
            "full_name": "Email <img src=x>",
            "organization": "ONG <b>Approval</b>",
            "role": "institutional",
        })
        assert create.status_code == 201

        approved = await client.post(
            f"/api/users/access-requests/{create.json()['id']}/approve",
            json={"note": "Bienvenue <script>alert(1)</script>"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert approved.status_code == 200
        assert len(sent) == 1
        email = sent[0]
        assert email["to_email"] == "email-approve@test.bf"
        assert "approuv" in email["subject"].lower()
        assert 'href="https://app.fasodata.test/auth/connexion"' in email["body_html"]
        assert email["unsubscribe_url"] == "https://app.fasodata.test/"
        assert "<img src=x>" not in email["body_html"]
        assert "&lt;img src=x&gt;" in email["body_html"]
        assert "<b>Approval</b>" not in email["body_html"]
        assert "&lt;b&gt;Approval&lt;/b&gt;" in email["body_html"]
        assert "<script>" not in email["body_html"]
        assert "&lt;script&gt;alert(1)&lt;/script&gt;" in email["body_html"]

    async def test_admin_rejects_access_request_and_sends_email(self, client, admin_token, monkeypatch):
        sent: list[dict] = []

        def fake_send(**kwargs):
            sent.append(kwargs)
            return True

        from fasodata.users import router as users_router

        monkeypatch.setattr(users_router, "_send", fake_send)
        monkeypatch.setattr(users_router.settings, "app_base_url", "https://app.fasodata.test")

        create = await client.post("/api/auth/register", json={
            "email": "email-reject@test.bf",
            "password": "Reject123!",
            "full_name": "Email <i>Reject</i>",
            "organization": "ONG <u>Reject</u>",
            "role": "institutional",
        })
        assert create.status_code == 201

        rejected = await client.post(
            f"/api/users/access-requests/{create.json()['id']}/reject",
            json={"note": "Dossier incomplet <b>urgent</b>"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert rejected.status_code == 200
        data = rejected.json()
        assert data["status"] == "rejected"
        assert len(sent) == 1
        email = sent[0]
        assert email["to_email"] == "email-reject@test.bf"
        assert "demande" in email["subject"].lower()
        assert email["unsubscribe_url"] == "https://app.fasodata.test/"
        assert "<i>Reject</i>" not in email["body_html"]
        assert "&lt;i&gt;Reject&lt;/i&gt;" in email["body_html"]
        assert "<u>Reject</u>" not in email["body_html"]
        assert "&lt;u&gt;Reject&lt;/u&gt;" in email["body_html"]
        assert "Dossier incomplet" in email["body_html"]
        assert "<b>urgent</b>" not in email["body_html"]
        assert "&lt;b&gt;urgent&lt;/b&gt;" in email["body_html"]


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
