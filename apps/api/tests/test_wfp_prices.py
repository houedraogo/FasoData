from datetime import date
from types import SimpleNamespace

import pytest
from sqlalchemy import func, select

from fasodata.core.celery_app import celery_app
from fasodata.prices.models import PriceData
from fasodata.prices.tasks import fetch_wfp_prices
from fasodata.prices.wfp_service import WfpPriceRecord, parse_wfp_price


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
    assert row.validation_status == "auto"
    assert row.notes and "wfp-123" in row.notes


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
