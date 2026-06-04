"""Tests des endpoints datasets."""

import pytest


@pytest.mark.asyncio
class TestListDatasets:
    async def test_list_published_public(self, client):
        resp = await client.get("/api/datasets")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_list_pagination(self, client):
        resp = await client.get("/api/datasets?page=1&page_size=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["items"]) <= 5

    async def test_list_filter_by_category(self, client):
        resp = await client.get("/api/datasets?category=Agriculture")
        assert resp.status_code == 200

    async def test_list_search_query(self, client):
        resp = await client.get("/api/datasets?q=céréales")
        assert resp.status_code == 200

    async def test_list_invalid_page(self, client):
        resp = await client.get("/api/datasets?page=0")
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestCreateDataset:
    async def test_create_requires_auth(self, client):
        resp = await client.post("/api/datasets", json={
            "name": "Test dataset", "license": "open",
        })
        assert resp.status_code == 401

    async def test_create_success_institutional(self, client, institutional_token):
        resp = await client.post(
            "/api/datasets",
            json={
                "name": "Dataset test ONG",
                "description": "Données test pour pytest",
                "license": "open",
                "category": "Agriculture",
                "tags": ["test", "pytest"],
            },
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Dataset test ONG"
        assert data["status"] == "draft"
        assert "slug" in data

    async def test_create_slug_generated(self, client, institutional_token):
        resp = await client.post(
            "/api/datasets",
            json={"name": "Prix des céréales 2024", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["slug"] == "prix-des-cereales-2024"

    async def test_create_public_forbidden(self, client):
        # Créer un utilisateur public et obtenir son token
        await client.post("/api/auth/register", json={
            "email": "public_ds@test.bf",
            "password": "Public123!",
            "role": "public",
        })
        login = await client.post(
            "/api/auth/login",
            data={"username": "public_ds@test.bf", "password": "Public123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = login.json()["access_token"]
        resp = await client.post(
            "/api/datasets",
            json={"name": "Interdit", "license": "open"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
class TestGetDataset:
    async def test_get_by_slug(self, client, institutional_token):
        # Créer d'abord un dataset
        create = await client.post(
            "/api/datasets",
            json={"name": "Dataset slug test", "license": "open", "status": "published"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]

        # Publier le dataset
        await client.patch(
            f"/api/datasets/{slug}",
            json={"status": "published"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )

        resp = await client.get(f"/api/datasets/{slug}")
        assert resp.status_code == 200
        assert resp.json()["slug"] == slug

    async def test_get_increments_view_count(self, client, institutional_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Dataset vues", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]
        await client.patch(
            f"/api/datasets/{slug}",
            json={"status": "published"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )

        r1 = await client.get(f"/api/datasets/{slug}")
        r2 = await client.get(f"/api/datasets/{slug}")
        assert r2.json()["view_count"] == r1.json()["view_count"] + 1

    async def test_get_not_found(self, client):
        resp = await client.get("/api/datasets/slug-inexistant")
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestUpdateDataset:
    async def test_update_name(self, client, institutional_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Ancien nom", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]

        resp = await client.patch(
            f"/api/datasets/{slug}",
            json={"name": "Nouveau nom"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Nouveau nom"

    async def test_publish_sets_published_at(self, client, institutional_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "À publier", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]

        resp = await client.patch(
            f"/api/datasets/{slug}",
            json={"status": "published"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["published_at"] is not None

    async def test_update_requires_auth(self, client, institutional_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Dataset auth test", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]

        resp = await client.patch(f"/api/datasets/{slug}", json={"name": "Hack"})
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestDatasetModerationWorkflow:
    async def test_submit_then_admin_approve_publishes_dataset(self, client, institutional_token, admin_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Workflow moderation dataset", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert create.status_code == 201, create.text
        slug = create.json()["slug"]
        assert create.json()["status"] == "draft"

        submit = await client.post(
            f"/api/datasets/{slug}/submit",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert submit.status_code == 200, submit.text
        assert submit.json()["status"] == "pending"

        approve = await client.post(
            f"/api/datasets/{slug}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert approve.status_code == 200, approve.text
        assert approve.json()["status"] == "published"
        assert approve.json()["published_at"] is not None

    async def test_institutional_cannot_approve_dataset(self, client, institutional_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Moderation forbidden approve", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]
        await client.post(
            f"/api/datasets/{slug}/submit",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )

        approve = await client.post(
            f"/api/datasets/{slug}/approve",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert approve.status_code == 403

    async def test_admin_reject_returns_dataset_to_draft(self, client, institutional_token, admin_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Moderation rejected dataset", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]
        await client.post(
            f"/api/datasets/{slug}/submit",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )

        reject = await client.post(
            f"/api/datasets/{slug}/reject",
            json={"note": "Metadonnees incompletes"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert reject.status_code == 200, reject.text
        assert reject.json()["status"] == "draft"
        assert reject.json()["published_at"] is None


@pytest.mark.asyncio
class TestDeleteDataset:
    async def test_delete_requires_admin(self, client, institutional_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "À supprimer", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]

        resp = await client.delete(
            f"/api/datasets/{slug}",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 403

    async def test_delete_success_admin(self, client, institutional_token, admin_token):
        create = await client.post(
            "/api/datasets",
            json={"name": "Suppression admin", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        slug = create.json()["slug"]

        resp = await client.delete(
            f"/api/datasets/{slug}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 204

        # Vérifier que le dataset n'existe plus
        get_resp = await client.get(f"/api/datasets/{slug}")
        assert get_resp.status_code == 404


@pytest.mark.asyncio
class TestAdminList:
    async def test_admin_list_requires_admin(self, client, institutional_token):
        resp = await client.get(
            "/api/datasets/admin-list",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 403

    async def test_admin_list_returns_all_statuses(self, client, admin_token):
        resp = await client.get(
            "/api/datasets/admin-list",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data


@pytest.mark.asyncio
class TestMyDatasets:
    async def test_my_datasets_returns_own_only(self, client, institutional_token):
        # Créer 2 datasets
        await client.post(
            "/api/datasets",
            json={"name": "Mon dataset 1", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        await client.post(
            "/api/datasets",
            json={"name": "Mon dataset 2", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )

        resp = await client.get(
            "/api/datasets/my",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2

    async def test_my_datasets_requires_auth(self, client):
        resp = await client.get("/api/datasets/my")
        assert resp.status_code == 401
