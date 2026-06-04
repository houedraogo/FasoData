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


@pytest.mark.asyncio
async def test_compare_countries_uses_wfp_validated_data_across_countries(client, db_session):
    rows = [
        PriceData(
            country="BFA",
            commodity="sorghum",
            region="Sahel",
            market="Dori",
            price=300,
            price_date=date(2026, 5, 10),
            source="wfp",
            n_obs=1,
            validation_status="auto",
        ),
        PriceData(
            country="BFA",
            commodity="sorghum",
            region="Centre",
            market="Ouagadougou",
            price=330,
            price_date=date(2026, 5, 11),
            source="wfp",
            n_obs=3,
            validation_status="auto",
        ),
        PriceData(
            country="MLI",
            commodity="sorghum",
            region="National",
            market="Bamako",
            price=420,
            price_date=date(2026, 5, 15),
            source="wfp",
            validation_status="auto",
        ),
        PriceData(
            country="NER",
            commodity="sorghum",
            region="National",
            market="Niamey",
            price=500,
            price_date=date(2026, 5, 15),
            source="wfp",
            validation_status="auto",
        ),
        PriceData(
            country="NER",
            commodity="sorghum",
            region="National",
            market="Niamey",
            price=999,
            price_date=date(2026, 5, 16),
            source="sms",
            validation_status="validated",
        ),
        PriceData(
            country="MLI",
            commodity="sorghum",
            region="National",
            market="Bamako",
            price=999,
            price_date=date(2026, 5, 16),
            source="wfp",
            validation_status="pending",
        ),
    ]
    db_session.add_all(rows)
    await db_session.commit()

    resp = await client.get(
        "/api/prices/compare?commodity=sorghum&countries=BFA,MLI,NER&start=2026-05&end=2026-05"
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["sources"] == ["wfp"]
    by_country = {item["country"]: item for item in data["countries"]}
    assert by_country["BFA"]["points"][0]["price"] == 322.5
    assert by_country["BFA"]["points"][0]["n_obs"] == 4
    assert by_country["MLI"]["points"][0]["price"] == 420.0
    assert by_country["NER"]["points"][0]["price"] == 500.0
