from datetime import date
from types import SimpleNamespace

import pytest
from sqlalchemy import func, select

from fasodata.core.celery_app import celery_app
from fasodata.prices.models import PriceData
from fasodata.prices.tasks import fetch_wfp_prices
from fasodata.prices.wfp_service import WfpPriceRecord, parse_hdx_price, parse_wfp_price


def admin_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_parse_wfp_price_normalizes_burkina_food_price():
    record = parse_wfp_price(
        {
            "commodityName": "Sorghum",
            "admin1Name": "Sahel",
            "marketName": "Dori",
            "price": "285.5",
            "unit": "XOF/KG",
            "priceTypeName": "retail",
            "priceDate": "2026-05-18T00:00:00Z",
            "priceId": "wfp-123",
        }
    )

    assert record is not None
    assert record.commodity == "sorghum"
    assert record.region == "Sahel"
    assert record.market == "Dori"
    assert record.price == 285.5
    assert record.unit == "XOF/KG"
    assert record.quality == "retail"
    assert record.price_date == date(2026, 5, 18)
    assert record.raw_id == "wfp-123"


def test_parse_hdx_price_normalizes_public_csv_row():
    record = parse_hdx_price(
        {
            "date": "2026-04-15",
            "admin1": "Sahel",
            "admin2": "Seno",
            "market": "Dori",
            "market_id": "123",
            "commodity": "Millet",
            "commodity_id": "55",
            "unit": "KG",
            "priceflag": "actual",
            "pricetype": "Retail",
            "currency": "XOF",
            "price": "310",
        }
    )

    assert record is not None
    assert record.commodity == "millet"
    assert record.region == "Sahel"
    assert record.market == "Dori"
    assert record.price == 310
    assert record.unit == "KG"
    assert record.quality == "Retail"
    assert record.price_date == date(2026, 4, 15)
    assert record.raw_id == "hdx:123:55:2026-04-15"
    assert record.provider == "HDX WFP Food Prices"


def test_parse_hdx_price_keeps_imported_rice_separate_from_local_rice():
    record = parse_hdx_price(
        {
            "date": "2026-04-15",
            "admin1": "Centre",
            "market": "Ouagadougou",
            "market_id": "456",
            "commodity": "Rice (imported)",
            "commodity_id": "77",
            "unit": "KG",
            "pricetype": "Retail",
            "price": "430",
        }
    )

    assert record is not None
    assert record.commodity == "rice_imported"
    assert record.raw_commodity == "Rice (imported)"


@pytest.mark.asyncio
async def test_fetch_wfp_prices_upserts_records(db_session, monkeypatch):
    settings = SimpleNamespace(
        database_url="postgresql+asyncpg://fasodata:changeme_db@db:5432/fasodata_test",
        wfp_prices_lookback_days=45,
        wfp_country_code="BFA",
    )

    monkeypatch.setattr("fasodata.core.config.get_settings", lambda: settings)

    calls = []

    def fake_fetch(start_date, end_date):
        calls.append((start_date, end_date))
        return [
            WfpPriceRecord(
                commodity="sorghum",
                region="Sahel",
                market="Dori",
                price=285,
                unit="CFA/kg",
                quality="retail",
                price_date=date(2026, 5, 18),
                raw_commodity="Sorghum",
                raw_id="wfp-123",
            )
        ]

    monkeypatch.setattr(
        "fasodata.prices.wfp_service.fetch_wfp_burkina_prices",
        fake_fetch,
    )

    first = fetch_wfp_prices(start_date_str="2026-05-01", end_date_str="2026-05-31")
    second = fetch_wfp_prices(start_date_str="2026-05-01", end_date_str="2026-05-31")

    assert first["created"] == 1
    assert first["updated"] == 0
    assert second["created"] == 0
    assert second["updated"] == 1
    assert calls == [
        (date(2026, 5, 1), date(2026, 5, 31)),
        (date(2026, 5, 1), date(2026, 5, 31)),
    ]

    count = await db_session.scalar(select(func.count()).select_from(PriceData))
    assert count == 1

    row = (await db_session.execute(select(PriceData))).scalar_one()
    assert row.source == "wfp"
    assert row.reporter == "WFP DataBridges"
    assert row.data_origin == "public"
    assert row.validation_status == "auto"
    assert row.notes and "wfp-123" in row.notes


@pytest.mark.asyncio
async def test_fetch_wfp_prices_creates_national_average_from_public_markets(db_session, monkeypatch):
    settings = SimpleNamespace(
        database_url="postgresql+asyncpg://fasodata:changeme_db@db:5432/fasodata_test",
        wfp_prices_lookback_days=45,
        wfp_country_code="BFA",
    )

    monkeypatch.setattr("fasodata.core.config.get_settings", lambda: settings)

    def fake_fetch(start_date, end_date):
        return [
            WfpPriceRecord(
                commodity="maize",
                region="Sahel",
                market="Dori",
                price=200,
                unit="KG",
                quality="Retail",
                price_date=date(2026, 4, 15),
                raw_commodity="Maize (white)",
                raw_id="hdx:1:67:2026-04-15",
                provider="HDX WFP Food Prices",
            ),
            WfpPriceRecord(
                commodity="maize",
                region="Centre",
                market="Ouagadougou",
                price=300,
                unit="KG",
                quality="Retail",
                price_date=date(2026, 4, 15),
                raw_commodity="Maize (white)",
                raw_id="hdx:2:67:2026-04-15",
                provider="HDX WFP Food Prices",
            ),
        ]

    monkeypatch.setattr(
        "fasodata.prices.wfp_service.fetch_wfp_burkina_prices",
        fake_fetch,
    )

    result = fetch_wfp_prices(start_date_str="2026-04-01", end_date_str="2026-04-30")

    assert result["fetched"] == 2
    assert result["national_aggregates"] == 1
    assert result["created"] == 3

    rows = (await db_session.execute(select(PriceData).order_by(PriceData.region))).scalars().all()
    national = next(row for row in rows if row.region == "National")
    assert national.price == 250
    assert national.market is None
    assert national.n_obs == 2
    assert national.data_origin == "public"
    assert national.reporter == "HDX WFP Food Prices"
    assert national.notes and "moyenne nationale" in national.notes


@pytest.mark.asyncio
async def test_trigger_wfp_fetch_queues_task(client, admin_token, monkeypatch):
    calls = []

    class FakeAsyncResult:
        id = "task-wfp-1"

    def fake_apply_async(**kwargs):
        calls.append(kwargs)
        return FakeAsyncResult()

    monkeypatch.setattr(
        "fasodata.prices.tasks.fetch_wfp_prices.apply_async",
        fake_apply_async,
    )

    resp = await client.post(
        "/api/prices/wfp/fetch?start_date=2026-05-01&end_date=2026-05-31",
        headers=admin_headers(admin_token),
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "queued"
    assert data["task_id"] == "task-wfp-1"
    assert calls[0]["queue"] == "prices"
    assert calls[0]["kwargs"] == {
        "start_date_str": "2026-05-01",
        "end_date_str": "2026-05-31",
    }


def test_wfp_fetch_is_scheduled_weekly_on_prices_queue():
    schedule = celery_app.conf.beat_schedule["fetch-wfp-prices-weekly"]

    assert schedule["task"] == "fasodata.prices.tasks.fetch_wfp_prices"
    assert schedule["options"]["queue"] == "prices"
