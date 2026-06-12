from datetime import date

import pytest

from fasodata.datasets.router import PRICE_DATASET_SLUG
from fasodata.datasets import router as datasets_router
from fasodata.prices.models import PriceData


async def create_price(db_session, *, data_origin: str = "public", price: float = 285):
    row = PriceData(
        commodity="sorghum",
        region="Sahel",
        market="Dori",
        price=price,
        unit="CFA/kg",
        quality="retail",
        price_date=date(2026, 5, 18),
        source="wfp",
        data_origin=data_origin,
        reporter="WFP DataBridges",
        validation_status="auto",
        notes="test price row",
    )
    db_session.add(row)
    await db_session.commit()
    return row


@pytest.mark.asyncio
async def test_price_dataset_is_listed_in_public_catalog(client, db_session):
    await create_price(db_session)

    resp = await client.get("/api/datasets?q=Prix")

    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    dataset = next(item for item in items if item["slug"] == PRICE_DATASET_SLUG)
    assert dataset["status"] == "published"
    assert dataset["category"] == "Agriculture"
    assert dataset["file_format"] == "csv"
    assert dataset["row_count"] == 1


@pytest.mark.asyncio
async def test_price_dataset_preview_returns_price_rows(client, db_session):
    await create_price(db_session)

    resp = await client.get(f"/api/datasets/{PRICE_DATASET_SLUG}/preview")

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_rows"] == 1
    assert "commodity" in data["columns"]
    assert data["rows"][0]["commodity"] == "sorghum"
    assert data["rows"][0]["region"] == "Sahel"
    assert data["rows"][0]["price_date"] == "2026-05-18"


@pytest.mark.asyncio
async def test_price_dataset_stats_returns_live_columns(client, db_session):
    await create_price(db_session)

    resp = await client.get(f"/api/datasets/{PRICE_DATASET_SLUG}/stats")

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["row_count"] == 1
    assert data["column_count"] >= 10
    assert data["columns"][0]["name"] == "commodity"


@pytest.mark.asyncio
async def test_price_dataset_download_streams_csv(client, db_session):
    await create_price(db_session)

    resp = await client.get(f"/api/datasets/{PRICE_DATASET_SLUG}/download")

    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"].startswith("text/csv")
    assert "prix-alimentaires-burkina-faso.csv" in resp.headers["content-disposition"]
    assert "commodity,region,market,price" in resp.text
    assert "sorghum,Sahel,Dori,285" in resp.text


@pytest.mark.asyncio
async def test_price_dataset_hides_seed_rows_in_production(client, db_session, monkeypatch):
    monkeypatch.setattr(datasets_router.settings, "environment", "production")
    await create_price(db_session, data_origin="seed", price=999)
    await create_price(db_session, data_origin="public", price=285)

    resp = await client.get(f"/api/datasets/{PRICE_DATASET_SLUG}/preview")

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_rows"] == 1
    assert len(data["rows"]) == 1
    assert data["rows"][0]["price"] == 285
    assert data["rows"][0]["data_origin"] == "public"
