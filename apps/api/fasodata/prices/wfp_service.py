"""Client minimal pour WFP DataBridges /MarketPrices/PriceDaily."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

import httpx

from fasodata.core.config import get_settings


class WfpCredentialsError(RuntimeError):
    """Raised when WFP OAuth credentials are not configured."""


@dataclass(frozen=True)
class WfpPriceRecord:
    commodity: str
    region: str
    market: str | None
    price: float
    unit: str
    quality: str | None
    price_date: date
    raw_commodity: str
    raw_id: str | None = None


COMMODITY_ALIASES = {
    "sorgho": "sorghum",
    "sorghum": "sorghum",
    "riz": "rice_local",
    "rice": "rice_local",
    "rice local": "rice_local",
    "mais": "maize",
    "maize": "maize",
    "corn": "maize",
    "mil": "millet",
    "millet": "millet",
    "niebe": "cowpea",
    "cowpea": "cowpea",
    "beans": "cowpea",
    "arachide": "groundnut",
    "groundnut": "groundnut",
    "peanut": "groundnut",
}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _ascii_lower(value: Any) -> str:
    text = unicodedata.normalize("NFKD", _clean(value))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.lower().replace("_", " ").split())


def normalize_commodity(value: Any) -> str | None:
    normalized = _ascii_lower(value)
    for needle, commodity in COMMODITY_ALIASES.items():
        if needle in normalized:
            return commodity
    return None


def _first(row: dict[str, Any], *keys: str) -> Any:
    lowered = {key.lower(): value for key, value in row.items()}
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
        value = lowered.get(key.lower())
        if value not in (None, ""):
            return value
    return None


def _parse_date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    text = _clean(value)
    if not text:
        return None
    text = text.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text).date()
    except ValueError:
        pass
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text[:10], fmt).date()
        except ValueError:
            continue
    return None


def _parse_price(value: Any) -> float | None:
    if isinstance(value, int | float):
        return float(value)
    text = _clean(value).replace(" ", "").replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _extract_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("items", "data", "value", "results", "records"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def parse_wfp_price(row: dict[str, Any]) -> WfpPriceRecord | None:
    raw_commodity = _first(
        row,
        "commodityName",
        "commodity_name",
        "commodity",
        "CommodityName",
        "cm_name",
    )
    commodity = normalize_commodity(raw_commodity)
    price = _parse_price(_first(row, "price", "value", "Price", "Value", "priceValue"))
    price_date = _parse_date(
        _first(row, "date", "priceDate", "price_date", "collectionDate", "surveyDate")
    )

    if not commodity or price is None or not price_date:
        return None

    region = _clean(
        _first(row, "admin1Name", "admin1", "adm1_name", "region", "RegionName")
    ) or "National"
    market = _clean(_first(row, "marketName", "market", "MarketName", "mkt_name")) or None
    unit = _clean(_first(row, "unit", "unitName", "priceUnit", "currency")) or "CFA/kg"
    quality = _clean(_first(row, "priceTypeName", "price_type", "quality")) or None
    raw_id = _clean(_first(row, "id", "priceId", "price_id")) or None

    return WfpPriceRecord(
        commodity=commodity,
        region=region,
        market=market,
        price=price,
        unit=unit,
        quality=quality,
        price_date=price_date,
        raw_commodity=_clean(raw_commodity),
        raw_id=raw_id,
    )


def _get_access_token(client: httpx.Client) -> str:
    settings = get_settings()
    if not settings.wfp_api_client_id or not settings.wfp_api_client_secret:
        raise WfpCredentialsError("WFP_API_CLIENT_ID/WFP_API_CLIENT_SECRET non configures")

    response = client.post(
        settings.wfp_token_url,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.wfp_api_client_id,
            "client_secret": settings.wfp_api_client_secret,
        },
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise WfpCredentialsError("La reponse OAuth WFP ne contient pas access_token")
    return token


def fetch_wfp_burkina_prices(start_date: date, end_date: date) -> list[WfpPriceRecord]:
    settings = get_settings()
    records: list[WfpPriceRecord] = []
    base_url = settings.wfp_api_base_url.rstrip("/")

    with httpx.Client(timeout=settings.wfp_prices_timeout_seconds) as client:
        token = _get_access_token(client)
        headers = {"Authorization": f"Bearer {token}"}
        page = 1

        while True:
            response = client.get(
                f"{base_url}/MarketPrices/PriceDaily",
                headers=headers,
                params={
                    "country_code": settings.wfp_country_code,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "price_flag": "actual",
                    "latest_value_only": "false",
                    "page": page,
                    "format": "json",
                    "env": "prod",
                },
            )
            response.raise_for_status()
            payload = response.json()
            items = _extract_items(payload)
            records.extend(record for item in items if (record := parse_wfp_price(item)))

            total_pages = payload.get("totalPages") if isinstance(payload, dict) else None
            has_next = payload.get("hasNextPage") if isinstance(payload, dict) else None
            if has_next is True or (isinstance(total_pages, int) and page < total_pages):
                page += 1
                continue
            break

    return records
