import pytest


@pytest.mark.asyncio
class TestPdfReports:
    async def test_export_pdf_requires_auth(self, client):
        resp = await client.post("/api/reports/00000000-0000-0000-0000-000000000000/export/pdf")
        assert resp.status_code == 401

    async def test_export_pdf_not_found(self, client, institutional_token):
        resp = await client.post(
            "/api/reports/00000000-0000-0000-0000-000000000000/export/pdf",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert resp.status_code == 404

    async def test_export_pdf_generates_real_pdf_from_dataset(self, client, institutional_token):
        created = await client.post(
            "/api/datasets",
            json={
                "name": "Rapport PDF dataset test",
                "description": "Dataset utilise pour verifier la generation PDF",
                "license": "open",
                "category": "Agriculture",
                "tags": ["pdf", "pytest"],
            },
            headers={"Authorization": f"Bearer {institutional_token}"},
        )
        assert created.status_code == 201, created.text
        dataset = created.json()

        resp = await client.post(
            f"/api/reports/{dataset['id']}/export/pdf",
            headers={"Authorization": f"Bearer {institutional_token}"},
        )

        assert resp.status_code == 200, resp.text
        assert resp.headers["content-type"] == "application/pdf"
        assert "rapport-rapport-pdf-dataset-test.pdf" in resp.headers["content-disposition"]
        assert resp.content.startswith(b"%PDF-1.4")
        assert b"%%EOF" in resp.content
        assert b"Rapport FasoData" in resp.content
