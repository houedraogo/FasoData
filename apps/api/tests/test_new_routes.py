"""
Tests des nouvelles routes ajoutées au projet FasoData :
  - GET /api/datasets/my          (mes datasets, institutionnel)
  - GET /api/datasets/admin-list  (tous les datasets, admin)
  - GET /api/datasets/{slug}/preview
  - GET /api/datasets/{slug}/stats
  - GET /api/datasets/{slug}/download
  - GET /api/datasets/{slug}/jobs
  - GET /api/users/me             (profil courant)
  - PATCH /api/users/me           (mise à jour profil)
  - GET /api/search               (recherche Meilisearch)
"""

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Helper : crée un dataset publié et renvoie son slug
# ─────────────────────────────────────────────────────────────────────────────

async def _create_published_dataset(client, token: str, name: str = "Dataset test route") -> str:
    resp = await client.post(
        "/api/datasets",
        json={"name": name, "license": "open", "category": "Agriculture"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    slug = resp.json()["slug"]

    await client.patch(
        f"/api/datasets/{slug}",
        json={"status": "published"},
        headers={"Authorization": f"Bearer {token}"},
    )
    return slug


# ─────────────────────────────────────────────────────────────────────────────
# /api/datasets/my
# ─────────────────────────────────────────────────────────────────────────────

class TestMyDatasets:
    async def test_my_datasets_requires_auth(self, client):
        resp = await client.get("/api/datasets/my")
        assert resp.status_code == 401

    async def test_my_datasets_empty_for_new_user(self, client, institutional_token):
        resp = await client.get(
            "/api/datasets/my",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 0

    async def test_my_datasets_shows_own_datasets(self, client, institutional_token):
        # Créer 2 datasets
        await _create_published_dataset(client, institutional_token, "DS-my-1")
        await _create_published_dataset(client, institutional_token, "DS-my-2")

        resp = await client.get(
            "/api/datasets/my",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 2

    async def test_my_datasets_all_statuses(self, client, institutional_token):
        # Crée un brouillon (draft par défaut)
        resp = await client.post(
            "/api/datasets",
            json={"name": "Brouillon test", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 201

        # /my doit le retourner (pas de filtre de statut par défaut)
        all_resp = await client.get(
            "/api/datasets/my",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert all_resp.status_code == 200
        assert all_resp.json()["total"] >= 1

    async def test_my_datasets_filter_by_status(self, client, institutional_token):
        await _create_published_dataset(client, institutional_token, "DS-filtre-pub")

        pub_resp = await client.get(
            "/api/datasets/my?status=published",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert pub_resp.status_code == 200
        for item in pub_resp.json()["items"]:
            assert item["status"] == "published"

    async def test_my_datasets_search(self, client, institutional_token):
        await _create_published_dataset(client, institutional_token, "Pluviométrie régionale 2025")

        resp = await client.get(
            "/api/datasets/my?q=Pluvi",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any("Pluvi" in item["name"] for item in items)

    async def test_my_datasets_pagination(self, client, institutional_token):
        resp = await client.get(
            "/api/datasets/my?page=1&page_size=3",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 3
        assert len(data["items"]) <= 3


# ─────────────────────────────────────────────────────────────────────────────
# /api/datasets/admin-list
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminListDatasets:
    async def test_requires_admin(self, client, institutional_token):
        resp = await client.get(
            "/api/datasets/admin-list",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 403

    async def test_requires_auth(self, client):
        resp = await client.get("/api/datasets/admin-list")
        assert resp.status_code == 401

    async def test_admin_sees_all_statuses(self, client, institutional_token, admin_token):
        # Crée un dataset en brouillon avec le compte institutionnel
        resp = await client.post(
            "/api/datasets",
            json={"name": "Draft visible admin", "license": "open"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 201

        # L'admin voit tout
        admin_resp = await client.get(
            "/api/datasets/admin-list",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_resp.status_code == 200
        data = admin_resp.json()
        assert "items" in data
        assert "total" in data

    async def test_admin_list_filter_by_status(self, client, institutional_token, admin_token):
        await _create_published_dataset(client, institutional_token, "DS-admin-pub")

        resp = await client.get(
            "/api/datasets/admin-list?status=published",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["status"] == "published"

    async def test_admin_list_search(self, client, institutional_token, admin_token):
        await _create_published_dataset(client, institutional_token, "Sécurité alimentaire Sahel")

        resp = await client.get(
            "/api/datasets/admin-list?q=Sahel",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any("Sahel" in item["name"] for item in items)

    async def test_admin_list_pagination(self, client, admin_token):
        resp = await client.get(
            "/api/datasets/admin-list?page=1&page_size=5",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["items"]) <= 5


# ─────────────────────────────────────────────────────────────────────────────
# /api/datasets/{slug}/preview  &  /stats  &  /download
# ─────────────────────────────────────────────────────────────────────────────

class TestDatasetSubRoutes:
    async def _setup(self, client, institutional_token):
        slug = await _create_published_dataset(client, institutional_token, "Dataset sous-routes")
        return slug

    async def test_preview_published_dataset(self, client, institutional_token):
        slug = await self._setup(client, institutional_token)
        resp = await client.get(f"/api/datasets/{slug}/preview")
        # 200 si colonnes_meta dispo, 422 si pas de fichier — les deux sont valides
        assert resp.status_code in (200, 422)

    async def test_preview_not_found(self, client):
        resp = await client.get("/api/datasets/slug-inexistant-xyz/preview")
        assert resp.status_code == 404

    async def test_stats_published_dataset(self, client, institutional_token):
        slug = await self._setup(client, institutional_token)
        resp = await client.get(f"/api/datasets/{slug}/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "row_count" in data
        assert "column_count" in data

    async def test_stats_not_found(self, client):
        resp = await client.get("/api/datasets/slug-inexistant-xyz/stats")
        assert resp.status_code == 404

    async def test_download_no_file(self, client, institutional_token):
        slug = await self._setup(client, institutional_token)
        resp = await client.get(f"/api/datasets/{slug}/download")
        # Sans fichier S3 : 404 avec message explicatif
        assert resp.status_code == 404
        assert "Importez" in resp.json()["detail"]

    async def test_preview_limit_param(self, client, institutional_token):
        slug = await self._setup(client, institutional_token)
        # Limite invalide (<1 ou >200) → 422
        resp = await client.get(f"/api/datasets/{slug}/preview?limit=0")
        assert resp.status_code == 422

    async def test_jobs_list_requires_auth(self, client, institutional_token):
        slug = await self._setup(client, institutional_token)
        resp = await client.get(f"/api/datasets/{slug}/jobs")
        assert resp.status_code == 401

    async def test_jobs_list_authenticated(self, client, institutional_token):
        slug = await self._setup(client, institutional_token)
        resp = await client.get(
            f"/api/datasets/{slug}/jobs",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ─────────────────────────────────────────────────────────────────────────────
# /api/users/me  (GET + PATCH)
# ─────────────────────────────────────────────────────────────────────────────

class TestUsersMe:
    async def test_get_me_returns_profile(self, client, institutional_token, institutional_user):
        resp = await client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == institutional_user.email
        assert data["role"] == "institutional"
        assert "hashed_password" not in data

    async def test_get_me_unauthenticated(self, client):
        resp = await client.get("/api/users/me")
        assert resp.status_code == 401

    async def test_patch_me_full_name(self, client, institutional_token):
        resp = await client.patch(
            "/api/users/me",
            json={"full_name": "Nouvelle Nathalie Kaboré"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Nouvelle Nathalie Kaboré"

    async def test_patch_me_organization(self, client, institutional_token):
        resp = await client.patch(
            "/api/users/me",
            json={"organization": "ACEEDO Burkina Faso"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["organization"] == "ACEEDO Burkina Faso"

    async def test_patch_me_bio(self, client, institutional_token):
        resp = await client.patch(
            "/api/users/me",
            json={"bio": "Coordonnatrice programmes humanitaires"},
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["bio"] == "Coordonnatrice programmes humanitaires"

    async def test_patch_me_unauthenticated(self, client):
        resp = await client.patch("/api/users/me", json={"full_name": "Hack"})
        assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# /api/search
# ─────────────────────────────────────────────────────────────────────────────

class TestSearch:
    async def test_search_returns_structure(self, client):
        resp = await client.get("/api/search?q=maïs")
        # Meilisearch peut ne pas être indexé mais l'endpoint doit répondre
        assert resp.status_code in (200, 503)

    async def test_search_empty_query(self, client):
        resp = await client.get("/api/search?q=")
        assert resp.status_code in (200, 422)

    async def test_search_pagination(self, client):
        resp = await client.get("/api/search?q=données&page=1&page_size=5")
        assert resp.status_code in (200, 503)
        if resp.status_code == 200:
            data = resp.json()
            assert "hits" in data or "items" in data


# ─────────────────────────────────────────────────────────────────────────────
# Routes admin — permissions
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminPermissions:
    async def test_non_admin_cannot_list_users(self, client, institutional_token):
        resp = await client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 403

    async def test_non_admin_cannot_delete_dataset(self, client, institutional_token):
        slug = await _create_published_dataset(client, institutional_token, "DS-perm-test")
        resp = await client.delete(
            f"/api/datasets/{slug}",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 403

    async def test_admin_can_list_all_users(self, client, admin_token):
        resp = await client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    async def test_admin_can_delete_dataset(self, client, institutional_token, admin_token):
        slug = await _create_published_dataset(client, institutional_token, "DS-to-delete-admin")
        resp = await client.delete(
            f"/api/datasets/{slug}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 204

    async def test_admin_can_update_user_role(self, client, admin_token, institutional_user):
        resp = await client.patch(
            f"/api/users/{institutional_user.id}",
            json={"role": "public"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "public"

    async def test_admin_can_deactivate_user(self, client, admin_token, institutional_user):
        resp = await client.patch(
            f"/api/users/{institutional_user.id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False
