"""
API des prix alimentaires.

Endpoints :
  GET  /api/prices                      — liste paginée des relevés bruts
  POST /api/prices                      — ajouter un relevé (opérateurs)
  GET  /api/prices/series               — série temporelle agrégée (mensuel/annuel)
  GET  /api/prices/latest               — dernier prix par produit
  GET  /api/prices/commodities          — liste des produits disponibles
  POST /api/prices/ingest/sms           — ingestion SMS générique
  POST /api/prices/ingest/whatsapp      — ingestion WhatsApp générique
  POST /api/prices/sms/at-callback      — webhook Africa's Talking (incoming SMS)
  POST /api/prices/sms/send             — envoyer un SMS de test (admin)
  GET  /api/prices/sms/status           — statut de la configuration AT
  POST /api/prices/sms/alert            — envoyer une alerte prix par SMS
"""

import re
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.auth.deps import get_current_active_user, require_admin, require_institutional
from fasodata.core.config import get_settings
from fasodata.core.data_origin import NON_PRODUCTION_ORIGINS, visible_origin_filter
from fasodata.core.database import get_db
from fasodata.prices import at_service
from fasodata.prices.at_service import build_confirmation, build_rejection
from fasodata.prices.models import PriceData
from fasodata.prices.schemas import (
    PriceDataCreate, PriceDataOut,
    PriceSeries, SeriesPoint,
    SmsIngestPayload, WhatsAppIngestPayload,
)
from fasodata.users.models import User

settings = get_settings()

router = APIRouter(prefix="/api/prices", tags=["prices"])

# ── Mapping FR → commodity key ─────────────────────────────────────────────
COMMODITY_ALIASES: dict[str, str] = {
    "sorgho":   "sorghum",
    "sorghum":  "sorghum",
    "riz importe": "rice_imported",
    "riz importé": "rice_imported",
    "rice imported": "rice_imported",
    "riz":      "rice_local",
    "rice":     "rice_local",
    "mais":     "maize",
    "maïs":     "maize",
    "maize":    "maize",
    "mil":      "millet",
    "millet":   "millet",
    "niebe":    "cowpea",
    "niébé":    "cowpea",
    "arachide": "groundnut",
}

COMMODITY_LABELS: dict[str, str] = {
    "sorghum":   "Sorgho",
    "rice_local":"Riz local",
    "rice_imported":"Riz importé",
    "maize":     "Maïs",
    "millet":    "Mil",
    "cowpea":    "Niébé",
    "groundnut": "Arachide",
}

DEFAULT_SERIES_SOURCES = ["wfp", "sms", "aggregated"]
SERIES_VALID_STATUSES = ["auto", "validated"]

COUNTRY_META: dict[str, dict] = {
    "BFA": {"name": "Burkina Faso", "capital": "Ouagadougou", "color": "#E04E2F"},
    "MLI": {"name": "Mali",          "capital": "Bamako",       "color": "#1A2C42"},
    "NER": {"name": "Niger",         "capital": "Niamey",       "color": "#D97706"},
}


# ── Helpers ────────────────────────────────────────────────────────────────

def _parse_sms(message: str) -> PriceDataCreate | None:
    """
    Tente de parser un SMS de relevé de prix.
    Format attendu : <PRODUIT> <REGION> <PRIX>
    Ex: "SORGHO SAHEL 285" ou "Riz local Ouaga 520"
    """
    parts = message.strip().split()
    if len(parts) < 3:
        return None
    try:
        price = float(parts[-1].replace(",", "."))
        region = parts[-2].title()
        commodity_raw = " ".join(parts[:-2]).lower().strip()
        commodity = COMMODITY_ALIASES.get(commodity_raw)
        if not commodity:
            return None
        return PriceDataCreate(
            commodity=commodity,
            region=region,
            price=price,
            price_date=date.today(),
            source="sms",
        )
    except (ValueError, IndexError):
        return None


def _parse_series_sources(value: str | None) -> list[str]:
    if not value:
        return DEFAULT_SERIES_SOURCES
    sources = [item.strip().lower() for item in value.split(",") if item.strip()]
    return sources or DEFAULT_SERIES_SOURCES


def _visible_price_filters() -> list:
    origin_filter = visible_origin_filter(PriceData.data_origin, settings)
    if origin_filter is not None:
        return [origin_filter]
    return [PriceData.data_origin.notin_(NON_PRODUCTION_ORIGINS)]


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/commodities")
async def list_commodities(db: AsyncSession = Depends(get_db)):
    """Liste les produits disponibles avec leur dernier prix."""
    result = await db.execute(
        select(PriceData.commodity, func.max(PriceData.price_date).label("last_date"))
        .where(*_visible_price_filters())
        .group_by(PriceData.commodity)
    )
    return [
        {"commodity": row.commodity, "label": COMMODITY_LABELS.get(row.commodity, row.commodity), "last_date": row.last_date}
        for row in result.all()
    ]


@router.get("/latest")
async def latest_prices(
    region:  str = "National",
    country: str = "BFA",
    sources: str | None = Query(None, description="Sources separees par virgule: wfp,sms,aggregated"),
    db: AsyncSession = Depends(get_db),
):
    """Dernier prix de chaque produit pour une région et un pays."""
    selected_sources = _parse_series_sources(sources) if sources else None
    source_filters = [PriceData.source.in_(selected_sources)] if selected_sources else []
    subq = (
        select(PriceData.commodity, func.max(PriceData.price_date).label("max_date"))
        .where(PriceData.region == region, PriceData.country == country, *_visible_price_filters(), *source_filters)
        .group_by(PriceData.commodity)
        .subquery()
    )
    result = await db.execute(
        select(PriceData)
        .join(subq, (PriceData.commodity == subq.c.commodity) & (PriceData.price_date == subq.c.max_date))
        .where(PriceData.region == region, PriceData.country == country, *_visible_price_filters(), *source_filters)
        .order_by(PriceData.commodity)
    )
    rows = result.scalars().all()
    return [PriceDataOut.model_validate(r) for r in rows]


@router.get("/compare-overview")
async def compare_countries_overview(
    commodity: str = Query("maize", description="Produit : sorghum, maize, millet…"),
    region:    str = Query("National"),
    db: AsyncSession = Depends(get_db),
):
    """
    Comparaison inter-pays : prix actuels + série annuelle pour BFA, MLI, NER.
    Retourne : current_prices, series (2020→présent, annuel), meta pays.
    """
    commodity = COMMODITY_ALIASES.get(commodity.lower(), commodity)
    countries  = ["BFA", "MLI", "NER"]

    # ── Prix actuels par pays ─────────────────────────────────────────────────
    current: dict[str, dict] = {}
    for country in countries:
        subq = (
            select(func.max(PriceData.price_date).label("max_date"))
            .where(PriceData.commodity == commodity,
                   PriceData.region    == region,
                   PriceData.country   == country,
                   *_visible_price_filters())
            .subquery()
        )
        row = (await db.execute(
            select(PriceData)
            .where(PriceData.commodity == commodity,
                   PriceData.region    == region,
                   PriceData.country   == country,
                   PriceData.price_date == subq.c.max_date,
                   *_visible_price_filters())
            .limit(1)
        )).scalar_one_or_none()

        current[country] = {
            "country":    country,
            "name":       COUNTRY_META.get(country, {}).get("name", country),
            "color":      COUNTRY_META.get(country, {}).get("color", "#888"),
            "price":      round(row.price, 0) if row else None,
            "price_date": row.price_date.isoformat() if row else None,
            "unit":       row.unit if row else "CFA/kg",
        }

    # ── Série annuelle 2020→présent ───────────────────────────────────────────
    rows = (await db.execute(
        select(
            PriceData.country,
            func.extract("year", PriceData.price_date).label("year"),
            func.avg(PriceData.price).label("avg_price"),
        )
        .where(
            PriceData.commodity == commodity,
            PriceData.region    == region,
            PriceData.country.in_(countries),
            *_visible_price_filters(),
        )
        .group_by(PriceData.country, func.extract("year", PriceData.price_date))
        .order_by(PriceData.country, "year")
    )).all()

    # Pivot : { year: { BFA: prix, MLI: prix, NER: prix } }
    series_map: dict[int, dict] = {}
    for row in rows:
        yr = int(row.year)
        if yr not in series_map:
            series_map[yr] = {"year": yr}
        series_map[yr][row.country] = round(row.avg_price, 0)

    series = sorted(series_map.values(), key=lambda x: x["year"])

    # ── Stats (min/max/variation) ─────────────────────────────────────────────
    prices_with_data = [v for v in current.values() if v["price"] is not None]
    if prices_with_data:
        most_expensive  = max(prices_with_data, key=lambda x: x["price"])
        cheapest        = min(prices_with_data, key=lambda x: x["price"])
        spread_pct      = round(((most_expensive["price"] - cheapest["price"]) / cheapest["price"]) * 100, 1) if cheapest["price"] else 0
    else:
        most_expensive = cheapest = None
        spread_pct = 0

    return {
        "commodity":      commodity,
        "commodity_label": COMMODITY_LABELS.get(commodity, commodity),
        "region":          region,
        "current_prices":  list(current.values()),
        "series":          series,
        "stats": {
            "most_expensive":  most_expensive,
            "cheapest":        cheapest,
            "spread_pct":      spread_pct,
            "countries_count": len([v for v in current.values() if v["price"] is not None]),
        },
    }


@router.get("/series", response_model=PriceSeries)
async def price_series(
    commodity:   str = Query(..., description="Ex: sorghum, rice_local"),
    region:      str = Query("National"),
    granularity: str = Query("monthly", pattern="^(monthly|yearly)$"),
    start:       str | None = Query(None, description="YYYY-MM"),
    end:         str | None = Query(None, description="YYYY-MM"),
    sources:     str | None = Query(None, description="Sources separees par virgule: wfp,sms,aggregated"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne la série temporelle agrégée (moyenne mensuelle ou annuelle)
    pour un produit et une région donnés.
    """
    commodity = COMMODITY_ALIASES.get(commodity.lower(), commodity)
    selected_sources = _parse_series_sources(sources)

    q = select(PriceData).where(
        PriceData.commodity == commodity,
        PriceData.region    == region,
        PriceData.source.in_(selected_sources),
        *_visible_price_filters(),
        or_(
            PriceData.validation_status.in_(SERIES_VALID_STATUSES),
            and_(
                PriceData.source == "aggregated",
                PriceData.validation_status == "aggregated",
            ),
        ),
    )
    if start:
        q = q.where(PriceData.price_date >= date.fromisoformat(start + "-01"))
    if end:
        try:
            y, m = map(int, end.split("-"))
            import calendar
            last_day = calendar.monthrange(y, m)[1]
            q = q.where(PriceData.price_date <= date(y, m, last_day))
        except (ValueError, AttributeError):
            pass

    result = await db.execute(q.order_by(PriceData.price_date))
    rows = result.scalars().all()

    if not rows:
        return PriceSeries(
            commodity=commodity, region=region,
            granularity=granularity, source="+".join(selected_sources),
            sources=selected_sources,
            points=[]
        )

    # Agréger en mémoire (simple et efficace pour les volumes courants)
    buckets: dict[str, dict] = {}
    for row in rows:
        if granularity == "monthly":
            key = f"{row.price_date.year:04d}-{row.price_date.month:02d}"
        else:
            key = str(row.price_date.year)
        weight = max(1, int(row.n_obs or 1))
        bucket = buckets.setdefault(
            key,
            {"weighted_sum": 0.0, "weight": 0, "prices": [], "sources": {}},
        )
        bucket["weighted_sum"] += row.price * weight
        bucket["weight"] += weight
        bucket["prices"].append(row.price)
        bucket["sources"][row.source] = bucket["sources"].get(row.source, 0) + weight

    points = [
        SeriesPoint(
            period=k,
            price=round(v["weighted_sum"] / v["weight"], 1),
            min=round(min(v["prices"]), 1),
            max=round(max(v["prices"]), 1),
            n_obs=v["weight"],
            sources=v["sources"],
        )
        for k, v in sorted(buckets.items())
    ]

    return PriceSeries(
        commodity=commodity,
        region=region,
        granularity=granularity,
        source="+".join(selected_sources),
        sources=selected_sources,
        points=points,
    )


@router.get("", response_model=dict)
async def list_prices(
    commodity: str | None = None,
    region:    str | None = None,
    source:    str | None = None,
    page:      int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Liste paginée des relevés bruts."""
    q = select(PriceData).where(*_visible_price_filters())
    if commodity:
        commodity = COMMODITY_ALIASES.get(commodity.lower(), commodity)
        q = q.where(PriceData.commodity == commodity)
    if region:
        q = q.where(PriceData.region == region)
    if source:
        q = q.where(PriceData.source == source)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    q = q.order_by(PriceData.price_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    items = result.scalars().all()

    return {
        "items": [PriceDataOut.model_validate(r) for r in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=PriceDataOut, status_code=201)
async def add_price(
    data: PriceDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    """Ajouter un relevé de prix (opérateur institutionnel)."""
    data.commodity = COMMODITY_ALIASES.get(data.commodity.lower(), data.commodity)
    data.data_origin = "manual"
    row = PriceData(**data.model_dump(), reporter=str(current_user.id))
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return PriceDataOut.model_validate(row)


@router.post("/ingest/sms", status_code=201)
async def ingest_sms(
    payload: SmsIngestPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Point d'entrée pour les agrégateurs SMS (Africa's Talking, Twilio, etc.).
    Le message doit suivre le format : <PRODUIT> <REGION> <PRIX>
    Ex: "SORGHO SAHEL 285"
    """
    parsed = _parse_sms(payload.message)
    if not parsed:
        raise HTTPException(
            422,
            detail=f"Format non reconnu : '{payload.message}'. Attendu : <PRODUIT> <REGION> <PRIX>"
        )
    parsed.source = "sms"
    parsed.data_origin = "field"
    parsed.reporter = payload.from_number
    if payload.received_at:
        parsed.price_date = payload.received_at.date()

    row = PriceData(**parsed.model_dump())
    db.add(row)
    await db.flush()
    return {"status": "accepted", "parsed": parsed.model_dump()}


@router.post("/ingest/whatsapp", status_code=201)
async def ingest_whatsapp(
    payload: WhatsAppIngestPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Point d'entrée WhatsApp Business API.
    Même format de message que SMS.
    """
    parsed = _parse_sms(payload.message)
    if not parsed:
        raise HTTPException(
            422,
            detail=f"Format non reconnu : '{payload.message}'. Attendu : <PRODUIT> <REGION> <PRIX>"
        )
    parsed.source = "whatsapp"
    parsed.data_origin = "field"
    parsed.reporter = payload.wa_id
    if payload.received_at:
        parsed.price_date = payload.received_at.date()

    row = PriceData(**parsed.model_dump())
    db.add(row)
    await db.flush()
    return {"status": "accepted", "parsed": parsed.model_dump()}


# ══════════════════════════════════════════════════════════════════════════════
# AFRICA'S TALKING — Webhook + envoi + statut
# ══════════════════════════════════════════════════════════════════════════════

COMMODITY_LABELS_FR: dict[str, str] = {
    "sorghum":    "Sorgho",
    "rice_local": "Riz local",
    "rice_imported": "Riz importé",
    "maize":      "Maïs",
    "millet":     "Mil",
    "cowpea":     "Niébé",
    "groundnut":  "Arachide",
}


@router.post("/sms/at-callback", status_code=200)
async def at_incoming_sms(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook Africa's Talking — reçoit les SMS des enquêteurs terrain.

    AT envoie un POST form-urlencoded avec les champs :
      - from   : numéro expéditeur (+22670XXXXXX)
      - to     : votre numéro AT / shortcode
      - text   : contenu du SMS
      - date   : horodatage AT
      - id     : identifiant unique du message

    Format SMS attendu : <PRODUIT> <REGION> <PRIX>
    Exemples : "SORGHO SAHEL 285" · "RIZ BOBO 520" · "MAIS OUAGA 302"

    ⚙️ Configurer dans le portail AT :
      Callback URL → https://votre-domaine.bf/api/prices/sms/at-callback
    """
    form        = await request.form()
    from_number = str(form.get("from", ""))
    text        = str(form.get("text", "")).strip()
    at_msg_id   = str(form.get("id", ""))

    parsed = _parse_sms(text)

    if parsed is None:
        rejection_msg = build_rejection(text)
        at_service.send_sms([from_number], rejection_msg)
        return JSONResponse({
            "status": "rejected",
            "from": from_number,
            "text": text,
            "reason": "format_inconnu",
        })

    parsed.source   = "sms"
    parsed.data_origin = "field"
    parsed.reporter = from_number
    parsed.notes    = f"AT msg_id={at_msg_id}"

    # SMS entrants → statut "pending" par défaut (auto-validation Celery)
    parsed.source = "sms"
    row = PriceData(**parsed.model_dump(), validation_status="pending")
    db.add(row)
    await db.flush()
    await db.refresh(row)

    # Lancer l'auto-validation en arrière-plan (Celery)
    try:
        from fasodata.prices.tasks import auto_validate_sms_price
        auto_validate_sms_price.apply_async(
            args=[str(row.id)], queue="prices", countdown=5
        )
    except Exception as e:
        logger.warning(f"Impossible de lancer auto_validate_sms_price : {e}")

    commodity_label = COMMODITY_LABELS_FR.get(parsed.commodity, parsed.commodity)
    confirmation = build_confirmation(
        commodity_label=commodity_label,
        region=parsed.region,
        price=parsed.price,
        price_date=parsed.price_date,
    )
    at_service.send_sms([from_number], confirmation)

    return JSONResponse({
        "status": "accepted",
        "from": from_number,
        "commodity": parsed.commodity,
        "region": parsed.region,
        "price": parsed.price,
        "confirmation_sent": True,
    })


@router.get("/sms/status")
async def at_status():
    """Statut de la configuration Africa's Talking."""
    return {
        "at_configured":  at_service.is_configured(),
        "at_sandbox":     settings.at_sandbox,
        "at_username":    settings.at_username,
        "api_key_set":    bool(settings.at_api_key),
        "note": (
            "Mode simulation — AT_API_KEY non défini"
            if not at_service.is_configured()
            else "Africa's Talking opérationnel"
        ),
        "webhook_url":  "/api/prices/sms/at-callback",
        "sms_format":   "PRODUIT REGION PRIX — ex: SORGHO SAHEL 285",
        "produits_reconnus": list(COMMODITY_ALIASES.keys()),
    }


class SendSmsRequest(BaseModel):
    to:      str
    message: str


@router.post("/sms/send")
async def send_test_sms(
    payload: SendSmsRequest,
    current_user: User = Depends(require_admin),
):
    """Envoyer un SMS de test — réservé admin."""
    return at_service.send_sms([payload.to], payload.message)


class AlertRequest(BaseModel):
    recipients:    list[str]
    commodity:     str
    region:        str
    current_price: float
    threshold:     float


@router.post("/sms/alert")
async def send_price_alert_sms(
    payload: AlertRequest,
    current_user: User = Depends(require_institutional),
):
    """Déclencher une alerte SMS prix."""
    commodity_label = COMMODITY_LABELS_FR.get(
        COMMODITY_ALIASES.get(payload.commodity.lower(), payload.commodity),
        payload.commodity,
    )
    return at_service.send_price_alert(
        recipients=payload.recipients,
        commodity_label=commodity_label,
        region=payload.region,
        current_price=payload.current_price,
        threshold=payload.threshold,
    )


@router.get("/sms/history")
async def sms_history(
    page:      int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Historique des SMS reçus (source=sms)."""
    q = (
        select(PriceData)
        .where(PriceData.source == "sms")
        .order_by(PriceData.created_at.desc())
    )
    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total   = total_r.scalar_one()

    q = q.offset((page - 1) * page_size).limit(page_size)
    result  = await db.execute(q)
    items   = result.scalars().all()

    return {
        "items":     [PriceDataOut.model_validate(r) for r in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    }


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION ADMIN — Valider / Rejeter les relevés SMS
# ══════════════════════════════════════════════════════════════════════════════

import uuid as _uuid


@router.get("/validation/queue")
async def validation_queue(
    status:    str | None = Query(None, description="pending | validated | rejected | aggregated"),
    commodity: str | None = None,
    region:    str | None = None,
    page:      int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    File d'attente de validation des relevés SMS.
    Par défaut retourne les relevés "pending" (suspects, anomalies).
    """
    q = select(PriceData).where(PriceData.source == "sms")

    if status:
        q = q.where(PriceData.validation_status == status)
    else:
        q = q.where(PriceData.validation_status == "pending")  # défaut : à valider

    if commodity:
        q = q.where(PriceData.commodity == COMMODITY_ALIASES.get(commodity.lower(), commodity))
    if region:
        q = q.where(PriceData.region == region)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total   = total_r.scalar_one()

    q = q.order_by(PriceData.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result  = await db.execute(q)
    items   = result.scalars().all()

    # Compteurs par statut
    counts_r = await db.execute(
        select(PriceData.validation_status, func.count().label("n"))
        .where(PriceData.source == "sms")
        .group_by(PriceData.validation_status)
    )
    counts = {row.validation_status: row.n for row in counts_r.all()}

    return {
        "items":      [PriceDataOut.model_validate(r) for r in items],
        "total":      total,
        "page":       page,
        "page_size":  page_size,
        "counts":     counts,
    }


class ValidationAction(BaseModel):
    action: str   # "validate" | "reject"
    note:   str | None = None


@router.post("/validation/{price_id}")
async def validate_price(
    price_id: str,
    body: ValidationAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Valider ou rejeter un relevé SMS.
    - validate : inclura ce relevé dans la prochaine agrégation nocturne
    - reject   : exclura ce relevé, enregistre la raison
    """
    try:
        uid = _uuid.UUID(price_id)
    except ValueError:
        raise HTTPException(400, "ID invalide")

    result = await db.execute(select(PriceData).where(PriceData.id == uid))
    row    = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Relevé introuvable")

    if body.action == "validate":
        row.validation_status = "validated"
    elif body.action == "reject":
        row.validation_status = "rejected"
    else:
        raise HTTPException(422, "action doit être 'validate' ou 'reject'")

    row.validated_by = current_user.email
    row.validated_at = datetime.now(timezone.utc)
    if body.note:
        row.notes = (row.notes or "") + f" | Admin note: {body.note}"

    await db.flush()
    return {
        "status":   "ok",
        "id":       price_id,
        "action":   body.action,
        "new_status": row.validation_status,
        "validated_by": current_user.email,
    }


@router.post("/validation/bulk")
async def bulk_validate(
    ids:    list[str],
    action: str = Query(..., pattern="^(validate|reject)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Valider ou rejeter plusieurs relevés en une fois."""
    from sqlalchemy import update

    uids = []
    for pid in ids:
        try:
            uids.append(_uuid.UUID(pid))
        except ValueError:
            continue

    new_status = "validated" if action == "validate" else "rejected"
    await db.execute(
        update(PriceData)
        .where(PriceData.id.in_(uids))
        .values(
            validation_status=new_status,
            validated_by=current_user.email,
            validated_at=datetime.now(timezone.utc),
        )
    )
    return {"status": "ok", "updated": len(uids), "action": action}


@router.post("/aggregation/trigger")
async def trigger_aggregation(
    target_date: str | None = Query(None, description="YYYY-MM-DD (défaut: aujourd'hui)"),
    current_user: User = Depends(require_admin),
):
    """
    Déclencher manuellement l'agrégation nocturne — réservé admin.
    Utile pour tester sans attendre 23h00.
    """
    from fasodata.prices.tasks import aggregate_daily_sms

    task = aggregate_daily_sms.apply_async(
        kwargs={"target_date_str": target_date},
        queue="prices",
    )
    return {
        "status":      "queued",
        "task_id":     task.id,
        "target_date": target_date or str(date.today()),
        "message":     "Agrégation lancée — résultat disponible dans les logs Celery",
    }


@router.post("/wfp/fetch")
async def trigger_wfp_fetch(
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    current_user: User = Depends(require_admin),
):
    """Declencher manuellement la synchronisation WFP DataBridges."""
    from fasodata.prices.tasks import fetch_wfp_prices

    task = fetch_wfp_prices.apply_async(
        kwargs={"start_date_str": start_date, "end_date_str": end_date},
        queue="prices",
    )
    return {
        "status": "queued",
        "task_id": task.id,
        "source": "wfp",
        "start_date": start_date,
        "end_date": end_date,
        "message": "Synchronisation WFP lancee",
    }


@router.get("/aggregation/history")
async def aggregation_history(
    page:      int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Historique des enregistrements agrégés (source=aggregated)."""
    q = (
        select(PriceData)
        .where(PriceData.source == "aggregated")
        .order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
    )
    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total   = total_r.scalar_one()

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return {
        "items":     [PriceDataOut.model_validate(r) for r in result.scalars().all()],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    }


# ══════════════════════════════════════════════════════════════════════════════
# COMPARAISON INTER-PAYS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/countries")
async def list_countries(db: AsyncSession = Depends(get_db)):
    """Liste des pays disponibles dans la base."""
    result = await db.execute(
        select(PriceData.country).where(*_visible_price_filters()).distinct().order_by(PriceData.country)
    )
    countries = [row[0] for row in result.all() if row[0]]
    return [
        {**COUNTRY_META.get(c, {"name": c, "capital": "—", "color": "#6b7280"}), "code": c}
        for c in countries
    ]


@router.get("/compare")
async def compare_countries(
    commodity:   str = Query("sorghum", description="Clé du produit"),
    countries:   str = Query("BFA,MLI,NER", description="Codes ISO-3 séparés par virgule"),
    granularity: str = Query("monthly", pattern="^(monthly|yearly)$"),
    start:       str | None = Query(None, description="YYYY-MM"),
    end:         str | None = Query(None, description="YYYY-MM"),
    sources:     str | None = Query("wfp", description="Sources separees par virgule, wfp par defaut"),
    db: AsyncSession = Depends(get_db),
):
    """
    Comparaison des prix d'un produit entre plusieurs pays.
    Retourne une série temporelle par pays.

    Exemple : /api/prices/compare?commodity=sorghum&countries=BFA,MLI,NER&granularity=monthly&start=2022-01
    """
    commodity = COMMODITY_ALIASES.get(commodity.lower(), commodity)
    country_list = [c.strip().upper() for c in countries.split(",") if c.strip()]
    selected_sources = _parse_series_sources(sources)

    series_by_country: dict[str, list[SeriesPoint]] = {}

    for country_code in country_list:
        q = select(PriceData).where(
            PriceData.commodity == commodity,
            PriceData.country   == country_code,
            PriceData.source.in_(selected_sources),
            *_visible_price_filters(),
            or_(
                PriceData.validation_status.in_(SERIES_VALID_STATUSES),
                and_(
                    PriceData.source == "aggregated",
                    PriceData.validation_status == "aggregated",
                ),
            ),
        )
        if start:
            q = q.where(PriceData.price_date >= date.fromisoformat(start + "-01"))
        if end:
            try:
                y, m = map(int, end.split("-"))
                import calendar
                q = q.where(PriceData.price_date <= date(y, m, calendar.monthrange(y, m)[1]))
            except (ValueError, AttributeError):
                pass

        result = await db.execute(q.order_by(PriceData.price_date))
        rows   = result.scalars().all()

        # Agréger par période
        buckets: dict[str, dict] = {}
        for row in rows:
            if granularity == "monthly":
                key = f"{row.price_date.year:04d}-{row.price_date.month:02d}"
            else:
                key = str(row.price_date.year)
            weight = max(1, int(row.n_obs or 1))
            bucket = buckets.setdefault(
                key,
                {"weighted_sum": 0.0, "weight": 0, "prices": [], "sources": {}},
            )
            bucket["weighted_sum"] += row.price * weight
            bucket["weight"] += weight
            bucket["prices"].append(row.price)
            bucket["sources"][row.source] = bucket["sources"].get(row.source, 0) + weight

        series_by_country[country_code] = [
            SeriesPoint(
                period=k,
                price=round(v["weighted_sum"] / v["weight"], 1),
                min=round(min(v["prices"]), 1),
                max=round(max(v["prices"]), 1),
                n_obs=v["weight"],
                sources=v["sources"],
            )
            for k, v in sorted(buckets.items())
        ]

    # Construire la réponse : une liste de séries enrichies avec la méta pays
    result_series = []
    for country_code in country_list:
        meta = COUNTRY_META.get(country_code, {"name": country_code, "capital": "—", "color": "#6b7280"})
        result_series.append({
            "country":     country_code,
            "country_name":meta["name"],
            "capital":     meta["capital"],
            "color":       meta["color"],
            "commodity":   commodity,
            "label":       COMMODITY_LABELS.get(commodity, commodity),
            "granularity": granularity,
            "unit":        "CFA/kg",
            "source":      "+".join(selected_sources),
            "sources":     selected_sources,
            "points":      series_by_country.get(country_code, []),
        })

    return {
        "commodity":   commodity,
        "label":       COMMODITY_LABELS.get(commodity, commodity),
        "granularity": granularity,
        "source":      "+".join(selected_sources),
        "sources":     selected_sources,
        "countries":   result_series,
    }
