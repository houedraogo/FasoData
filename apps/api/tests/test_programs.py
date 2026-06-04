from datetime import date, datetime, timedelta, timezone

import pytest

from fasodata.dashboard.models import AlertRule, Program, ProgramPriceAlert
from fasodata.datasets.models import Dataset, DatasetStatus
from fasodata.prices.models import PriceData


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
class TestProgramsApi:
    async def test_dashboard_recommendations_use_preferences_and_database_sources(
        self,
        client,
        db_session,
        institutional_token,
        institutional_user,
    ):
        now = datetime.now(timezone.utc)
        db_session.add_all([
            Dataset(
                slug="prix-alimentaires-burkina-faso",
                name="Prix alimentaires - Burkina Faso",
                description="Donnees publiques de suivi des prix alimentaires issues de WFP.",
                category="Agriculture",
                tags=["prix", "WFP"],
                source="WFP DataBridges",
                status=DatasetStatus.published,
                published_at=now,
            ),
            Dataset(
                slug="carte-marches-sahel",
                name="Carte des marches du Sahel",
                description="Dataset geographique des marches suivis.",
                category="Cartographie",
                tags=["geo", "marches"],
                source="FasoData",
                status=DatasetStatus.published,
                is_geo=True,
                published_at=now,
            ),
            PriceData(
                commodity="maize",
                region="Sahel",
                market="Dori",
                price=342,
                unit="CFA/kg",
                price_date=date.today(),
                source="wfp",
                country="BFA",
                validation_status="auto",
            ),
            AlertRule(
                name="Mais Sahel seuil critique",
                metric_key="price.maize",
                comparator=">",
                threshold_value=320,
                unit="CFA/kg",
                region="Sahel",
                channels=["dashboard"],
                created_by_id=institutional_user.id,
            ),
        ])
        await db_session.commit()

        pref = await client.put(
            "/api/dashboard/preferences",
            json={
                "domains": ["prices", "territory"],
                "data_types": ["datasets", "alerts", "maps"],
                "regions": ["Sahel"],
            },
            headers=auth_headers(institutional_token),
        )
        assert pref.status_code == 200, pref.text

        resp = await client.get(
            "/api/dashboard/recommendations",
            headers=auth_headers(institutional_token),
        )
        assert resp.status_code == 200, resp.text
        items = resp.json()
        keys = {item["key"]: item for item in items}

        assert "prices-wfp" in keys
        assert keys["prices-wfp"]["metric"] == "1 observations"
        assert keys["prices-wfp"]["source"] == "WFP + FasoData SMS"
        assert "alerts-rules" in keys
        assert keys["alerts-rules"]["metric"] == "1 règles"
        assert "map-layers" in keys
        assert keys["map-layers"]["detail"] == "1 datasets géographiques publiés"
        assert "datasets-prices" in keys
        assert keys["datasets-prices"]["href"] == "/datasets/prix-alimentaires-burkina-faso"

    async def test_dashboard_preferences_are_created_and_updated_for_user(
        self,
        client,
        institutional_token,
    ):
        initial = await client.get(
            "/api/dashboard/preferences",
            headers=auth_headers(institutional_token),
        )
        assert initial.status_code == 200, initial.text
        data = initial.json()
        assert data["domains"] == ["prices"]
        assert data["data_types"] == ["time_series", "maps"]
        assert data["regions"] == ["National"]
        assert data["is_configured"] is False

        update = await client.put(
            "/api/dashboard/preferences",
            json={
                "domains": ["prices", "health"],
                "data_types": ["alerts", "datasets"],
                "regions": ["Sahel", "Centre"],
            },
            headers=auth_headers(institutional_token),
        )
        assert update.status_code == 200, update.text
        updated = update.json()
        assert updated["id"] == data["id"]
        assert updated["domains"] == ["prices", "health"]
        assert updated["data_types"] == ["alerts", "datasets"]
        assert updated["regions"] == ["Sahel", "Centre"]
        assert updated["is_configured"] is True

        reread = await client.get(
            "/api/dashboard/preferences",
            headers=auth_headers(institutional_token),
        )
        assert reread.json()["domains"] == ["prices", "health"]

    async def test_dashboard_preferences_require_minimum_choices(
        self,
        client,
        institutional_token,
    ):
        resp = await client.put(
            "/api/dashboard/preferences",
            json={"domains": [], "data_types": ["maps"], "regions": ["National"]},
            headers=auth_headers(institutional_token),
        )
        assert resp.status_code == 422

        resp = await client.put(
            "/api/dashboard/preferences",
            json={"domains": ["prices"], "data_types": [], "regions": ["National"]},
            headers=auth_headers(institutional_token),
        )
        assert resp.status_code == 422

    async def test_dashboard_overview_applies_user_preferences_to_kpis(
        self,
        client,
        db_session,
        institutional_token,
        institutional_user,
    ):
        now = datetime.now(timezone.utc)
        db_session.add_all([
            Dataset(
                slug="prix-sahel",
                name="Prix alimentaires Sahel",
                description="Prix cereales Sahel",
                category="Agriculture",
                source="WFP",
                status=DatasetStatus.published,
                published_at=now,
            ),
            Dataset(
                slug="sante-centre",
                name="Indicateurs sante Centre",
                description="Vaccination et nutrition",
                category="Sante",
                source="Ministere Sante",
                status=DatasetStatus.published,
                published_at=now,
            ),
            PriceData(
                commodity="maize",
                region="Sahel",
                market="Dori",
                price=342,
                unit="CFA/kg",
                price_date=date.today(),
                source="wfp",
                country="BFA",
                validation_status="auto",
            ),
            PriceData(
                commodity="maize",
                region="Centre",
                market="Ouagadougou",
                price=315,
                unit="CFA/kg",
                price_date=date.today(),
                source="wfp",
                country="BFA",
                validation_status="auto",
            ),
            Program(
                name="Programme sante Centre",
                sector="health",
                owner_id=institutional_user.id,
            ),
        ])
        await db_session.commit()

        pref = await client.put(
            "/api/dashboard/preferences",
            json={
                "domains": ["prices"],
                "data_types": ["datasets", "alerts"],
                "regions": ["Sahel"],
            },
            headers=auth_headers(institutional_token),
        )
        assert pref.status_code == 200, pref.text

        programs = await client.get(
            "/api/dashboard/programs",
            headers=auth_headers(institutional_token),
        )
        food_program_id = next(item["id"] for item in programs.json() if item["sector"] == "food_prices")
        db_session.add_all([
            ProgramPriceAlert(
                program_id=food_program_id,
                commodity="maize",
                region="Sahel",
                threshold_price=320,
                current_price=342,
                is_triggered=True,
                channels=["dashboard"],
                created_by_id=institutional_user.id,
            ),
            ProgramPriceAlert(
                program_id=food_program_id,
                commodity="maize",
                region="Centre",
                threshold_price=300,
                current_price=315,
                is_triggered=True,
                channels=["dashboard"],
                created_by_id=institutional_user.id,
            ),
        ])
        await db_session.commit()

        resp = await client.get(
            "/api/dashboard/overview",
            headers=auth_headers(institutional_token),
        )

        assert resp.status_code == 200, resp.text
        kpis = {item["key"]: item for item in resp.json()["kpis"]}
        assert kpis["programs"]["value"] == 1
        assert kpis["price_observations"]["value"] == 1
        assert kpis["price_observations"]["sub"] == "1 nouvelles"
        assert kpis["datasets"]["value"] == 1
        assert kpis["alerts"]["value"] == 1

    async def test_dashboard_region_summary_uses_preferred_regions(
        self,
        client,
        db_session,
        institutional_token,
    ):
        db_session.add_all([
            PriceData(
                commodity="maize",
                region="Sahel",
                market="Dori",
                price=340,
                unit="CFA/kg",
                price_date=date.today(),
                source="wfp",
                country="BFA",
                validation_status="auto",
            ),
            PriceData(
                commodity="maize",
                region="Centre",
                market="Ouagadougou",
                price=300,
                unit="CFA/kg",
                price_date=date.today(),
                source="wfp",
                country="BFA",
                validation_status="auto",
            ),
        ])
        await db_session.commit()

        await client.put(
            "/api/dashboard/preferences",
            json={"domains": ["prices"], "data_types": ["maps"], "regions": ["Sahel"]},
            headers=auth_headers(institutional_token),
        )
        resp = await client.get(
            "/api/dashboard/regions/summary",
            headers=auth_headers(institutional_token),
        )

        assert resp.status_code == 200, resp.text
        assert resp.json() == [
            {
                "region": "Sahel",
                "observations": 1,
                "avg_price": 340.0,
                "latest_date": date.today().isoformat(),
            }
        ]

    async def test_dashboard_overview_uses_database_kpis(
        self,
        client,
        db_session,
        institutional_token,
        institutional_user,
    ):
        now = datetime.now(timezone.utc)
        dataset = Dataset(
            slug="dataset-prix-test",
            name="Dataset prix test",
            license="open",
            status=DatasetStatus.published,
            published_at=now,
        )
        price = PriceData(
            commodity="maize",
            region="Sahel",
            market="Dori",
            price=342,
            unit="CFA/kg",
            price_date=date.today(),
            source="wfp",
            validation_status="auto",
        )
        old_price = PriceData(
            commodity="millet",
            region="Centre",
            market="Ouagadougou",
            price=315,
            unit="CFA/kg",
            price_date=date.today() - timedelta(days=40),
            source="sms",
            validation_status="validated",
        )
        db_session.add_all([dataset, price, old_price])
        await db_session.commit()

        programs = await client.get(
            "/api/dashboard/programs",
            headers=auth_headers(institutional_token),
        )
        program_id = programs.json()[0]["id"]
        db_session.add(
            ProgramPriceAlert(
                program_id=program_id,
                commodity="maize",
                region="Sahel",
                threshold_price=320,
                current_price=342,
                is_triggered=True,
                channels=["dashboard"],
                created_by_id=institutional_user.id,
            )
        )
        await db_session.commit()

        resp = await client.get(
            "/api/dashboard/overview",
            headers=auth_headers(institutional_token),
        )

        assert resp.status_code == 200, resp.text
        data = resp.json()
        kpis = {item["key"]: item for item in data["kpis"]}
        assert data["period"] == "30 derniers jours"
        assert kpis["programs"]["value"] == 1
        assert kpis["price_observations"]["value"] == 2
        assert kpis["price_observations"]["sub"] == "1 nouvelles"
        assert kpis["datasets"]["value"] == 1
        assert kpis["alerts"]["value"] == 1
        assert len(kpis["price_observations"]["spark"]) == 8

    async def test_list_programs_creates_default_food_prices_program(self, client, institutional_token):
        resp = await client.get(
            "/api/dashboard/programs",
            headers=auth_headers(institutional_token),
        )

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Suivi des prix alimentaires"
        assert data[0]["sector"] == "food_prices"

    async def test_program_crud(self, client, institutional_token):
        create = await client.post(
            "/api/dashboard/programs",
            json={
                "name": "Programme nutrition Sahel",
                "description": "Pilotage prix et couverture alimentaire",
                "sector": "nutrition",
                "period": "3m",
            },
            headers=auth_headers(institutional_token),
        )
        assert create.status_code == 201, create.text
        program = create.json()

        detail = await client.get(
            f"/api/dashboard/programs/{program['id']}",
            headers=auth_headers(institutional_token),
        )
        assert detail.status_code == 200, detail.text
        assert detail.json()["alerts"] == []
        assert detail.json()["scenarios"] == []

        update = await client.patch(
            f"/api/dashboard/programs/{program['id']}",
            json={"period": "12m", "status": "paused"},
            headers=auth_headers(institutional_token),
        )
        assert update.status_code == 200, update.text
        assert update.json()["period"] == "12m"
        assert update.json()["status"] == "paused"

        delete = await client.delete(
            f"/api/dashboard/programs/{program['id']}",
            headers=auth_headers(institutional_token),
        )
        assert delete.status_code == 204

    async def test_program_alert_uses_latest_price_and_can_be_deleted(
        self,
        client,
        db_session,
        institutional_token,
    ):
        price = PriceData(
            commodity="maize",
            region="Sahel",
            market="Dori",
            price=342,
            unit="CFA/kg",
            price_date=date.today(),
            source="wfp",
            validation_status="auto",
        )
        db_session.add(price)
        await db_session.commit()

        programs = await client.get(
            "/api/dashboard/programs",
            headers=auth_headers(institutional_token),
        )
        program_id = programs.json()[0]["id"]

        create = await client.post(
            f"/api/dashboard/programs/{program_id}/alerts",
            json={
                "commodity": "maize",
                "region": "Sahel",
                "threshold_price": 320,
                "channels": ["dashboard", "email"],
            },
            headers=auth_headers(institutional_token),
        )

        assert create.status_code == 201, create.text
        alert = create.json()
        assert alert["current_price"] == 342
        assert alert["is_triggered"] is True

        update = await client.patch(
            f"/api/dashboard/programs/{program_id}/alerts/{alert['id']}",
            json={"threshold_price": 360},
            headers=auth_headers(institutional_token),
        )
        assert update.status_code == 200, update.text
        assert update.json()["is_triggered"] is False

        delete = await client.delete(
            f"/api/dashboard/programs/{program_id}/alerts/{alert['id']}",
            headers=auth_headers(institutional_token),
        )
        assert delete.status_code == 204

    async def test_program_scenario_crud(self, client, institutional_token):
        programs = await client.get(
            "/api/dashboard/programs",
            headers=auth_headers(institutional_token),
        )
        program_id = programs.json()[0]["id"]

        create = await client.post(
            f"/api/dashboard/programs/{program_id}/scenarios",
            json={
                "name": "Sahel vs Centre",
                "region_a": "Sahel",
                "region_b": "Centre",
                "commodity": "maize",
                "parameters": {"period": "12m"},
            },
            headers=auth_headers(institutional_token),
        )
        assert create.status_code == 201, create.text
        scenario = create.json()

        update = await client.patch(
            f"/api/dashboard/programs/{program_id}/scenarios/{scenario['id']}",
            json={"name": "Sahel vs Cascades", "region_b": "Cascades"},
            headers=auth_headers(institutional_token),
        )
        assert update.status_code == 200, update.text
        assert update.json()["region_b"] == "Cascades"

        detail = await client.get(
            f"/api/dashboard/programs/{program_id}",
            headers=auth_headers(institutional_token),
        )
        assert len(detail.json()["scenarios"]) == 1

        delete = await client.delete(
            f"/api/dashboard/programs/{program_id}/scenarios/{scenario['id']}",
            headers=auth_headers(institutional_token),
        )
        assert delete.status_code == 204
