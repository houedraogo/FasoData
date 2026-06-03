from datetime import date

import pytest

from fasodata.prices.models import PriceData


async def add_price(
    db_session,
    *,
    source: str,
    price: float,
    status: str = "auto",
    n_obs: int = 1,
):
    row = PriceData(
        commodity="sorghum",
        region="Sahel",
        market="Dori",
        price=price,
        unit="CFA/kg",
        quality="retail",
        price_date=date(2026, 5, 18),
        source=source,
        reporter=source,
        n_obs=n_obs,
        validation_status=status,
    )
    db_session.add(row)
    await db_session.commit()
    return row


@pytest.mark.asyncio
async def test_series_combines_wfp_and_validated_sms(client, db_session):
    await add_price(db_session, source="wfp", price=300, status="auto")
    await add_price(db_session, source="sms", price=330, status="validated")

    resp = await client.get(
        "/api/prices/series?commodity=sorghum&region=Sahel&start=2026-05&end=2026-05"
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["source"] == "wfp+sms+aggregated"
    assert data["sources"] == ["wfp", "sms", "aggregated"]
    assert data["points"] == [
        {
            "period": "2026-05",
            "price": 315.0,
            "min": 300.0,
            "max": 330.0,
            "n_obs": 2,
            "sources": {"wfp": 1, "sms": 1},
        }
    ]


@pytest.mark.asyncio
async def test_series_uses_sms_aggregate_without_double_counting_source_sms(client, db_session):
    await add_price(db_session, source="wfp", price=300, status="auto")
    await add_price(db_session, source="sms", price=330, status="aggregated")
    await add_price(db_session, source="aggregated", price=320, status="auto", n_obs=3)

    resp = await client.get(
        "/api/prices/series?commodity=sorghum&region=Sahel&start=2026-05&end=2026-05"
    )

    assert resp.status_code == 200, resp.text
    point = resp.json()["points"][0]
    assert point["price"] == 315.0
    assert point["n_obs"] == 4
    assert point["sources"] == {"wfp": 1, "aggregated": 3}


@pytest.mark.asyncio
async def test_series_sources_filter_can_return_wfp_only(client, db_session):
    await add_price(db_session, source="wfp", price=300, status="auto")
    await add_price(db_session, source="sms", price=330, status="validated")

    resp = await client.get(
        "/api/prices/series?commodity=sorghum&region=Sahel&sources=wfp"
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["source"] == "wfp"
    assert data["sources"] == ["wfp"]
    assert data["points"][0]["price"] == 300.0
    assert data["points"][0]["sources"] == {"wfp": 1}
