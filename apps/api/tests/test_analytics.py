import pytest


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
class TestAnalyticsApi:
    async def test_collect_page_view_public_and_admin_stats(self, client, admin_token):
        created = await client.post(
            "/api/analytics/page-view",
            json={
                "path": "/datasets",
                "title": "Datasets",
                "referrer": "https://google.com/search?q=fasodata",
                "visitor_id": "visitor-a",
                "session_id": "session-a",
            },
            headers={"user-agent": "pytest"},
        )
        assert created.status_code == 201, created.text

        await client.post(
            "/api/analytics/page-view",
            json={
                "path": "/admin",
                "title": "Admin",
                "visitor_id": "visitor-a",
                "session_id": "session-a",
            },
        )
        await client.post(
            "/api/analytics/page-view",
            json={
                "path": "/dashboard",
                "title": "Dashboard",
                "visitor_id": "visitor-b",
                "session_id": "session-b",
            },
        )

        denied = await client.get("/api/analytics/stats")
        assert denied.status_code in (401, 403)

        stats = await client.get("/api/analytics/stats?days=30", headers=auth_headers(admin_token))
        assert stats.status_code == 200, stats.text
        data = stats.json()
        assert data["kpis"]["total_views"] == 3
        assert data["kpis"]["unique_visitors"] == 2
        assert data["kpis"]["public_views"] == 1
        assert data["kpis"]["private_views"] == 1
        assert data["kpis"]["admin_views"] == 1
        assert data["top_pages"][0]["views"] >= 1
        assert any(item["source"] == "google.com" for item in data["referrers"])

    async def test_collect_page_view_ignores_api_paths(self, client, admin_token):
        resp = await client.post(
            "/api/analytics/page-view",
            json={"path": "/api/health", "visitor_id": "visitor-a"},
        )
        assert resp.status_code == 201

        stats = await client.get("/api/analytics/stats", headers=auth_headers(admin_token))
        assert stats.status_code == 200
        assert stats.json()["kpis"]["total_views"] == 0
