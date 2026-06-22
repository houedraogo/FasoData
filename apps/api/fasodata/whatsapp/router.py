"""
Webhook WhatsApp pour FasoData.

- GET  /api/whatsapp/webhook  → vérification Meta
- POST /api/whatsapp/webhook  → messages entrants des enquêteurs

Format SMS d'un enquêteur :
  SORGHO SAHEL 285
  RIZ BOBO 520
  MAIS OUAGA 302

Réponse automatique :
  ✅ Prix enregistré : Sorgho · Sahel · 285 CFA/kg
"""

from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from sqlalchemy import text

from fasodata.alerts.whatsapp_service import send_whatsapp_text
from fasodata.core.config import get_settings
from fasodata.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

# ── Correspondances produit / région ────────────────────────────────────────

COMMODITY_MAP: dict[str, str] = {
    "SORGHO":   "sorghum",
    "RIZ":      "rice_local",
    "MAIS":     "maize",
    "MIL":      "millet",
    "NIEBE":    "cowpea",
    "ARACHIDE": "groundnut",
}

COMMODITY_LABELS: dict[str, str] = {
    "sorghum":    "Sorgho",
    "rice_local": "Riz local",
    "maize":      "Maïs",
    "millet":     "Mil",
    "cowpea":     "Niébé",
    "groundnut":  "Arachide",
}

REGION_MAP: dict[str, str] = {
    "SAHEL":     "Sahel",
    "OUAGA":     "Centre",
    "BOBO":      "Hauts-Bassins",
    "CENTRE":    "Centre",
    "NORD":      "Nord",
    "EST":       "Est",
    "OUEST":     "Boucle du Mouhoun",
    "SUD":       "Sud-Ouest",
    "CASCADE":   "Cascades",
    "PLATEAU":   "Plateau-Central",
    "CENTRE-EST":"Centre-Est",
    "CENTRE-SUD":"Centre-Sud",
    "CENTRE-NORD":"Centre-Nord",
    "CENTRE-OUEST":"Centre-Ouest",
}


def parse_price_message(text_body: str) -> list[dict[str, Any]]:
    """Parse un message enquêteur en liste de relevés prix."""
    results = []
    for line in text_body.strip().upper().splitlines():
        line = line.strip()
        if not line:
            continue
        # Format attendu : PRODUIT REGION PRIX
        m = re.match(r"^(\w[\w-]*)\s+(\w[\w-]*)\s+(\d+)$", line)
        if not m:
            continue
        raw_commodity, raw_region, raw_price = m.groups()
        commodity = COMMODITY_MAP.get(raw_commodity)
        region = REGION_MAP.get(raw_region)
        if commodity and region:
            results.append({
                "commodity": commodity,
                "region": region,
                "price": float(raw_price),
                "label": COMMODITY_LABELS.get(commodity, commodity),
            })
    return results


# ── Vérification webhook Meta ────────────────────────────────────────────────

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
):
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        logger.info("Webhook WhatsApp vérifié par Meta")
        return int(hub_challenge or 0)
    raise HTTPException(status_code=403, detail="Token de vérification invalide")


# ── Réception des messages entrants ─────────────────────────────────────────

@router.post("/webhook", status_code=200)
async def receive_webhook(request: Request):
    body = await request.json()
    settings = get_settings()

    try:
        entry = body.get("entry", [{}])[0]
        change = entry.get("changes", [{}])[0].get("value", {})
        messages = change.get("messages", [])

        for msg in messages:
            if msg.get("type") != "text":
                continue

            from_number = msg.get("from", "")
            text_body = msg.get("text", {}).get("body", "")
            logger.info("Message WA reçu de %s : %s", from_number, text_body)

            relevés = parse_price_message(text_body)

            if not relevés:
                send_whatsapp_text(
                    to_number=from_number,
                    message=(
                        "❌ Format non reconnu.\n"
                        "Envoyez : PRODUIT REGION PRIX\n"
                        "Ex : SORGHO SAHEL 285\n"
                        "Produits : SORGHO RIZ MAIS MIL NIEBE ARACHIDE"
                    ),
                    settings=settings,
                )
                continue

            today = date.today()
            confirmations = []

            async with AsyncSessionLocal() as db:
                for r in relevés:
                    await db.execute(
                        text("""
                            INSERT INTO price_data
                              (commodity, region, price, price_date, data_origin, source, n_observations)
                            VALUES
                              (:commodity, :region, :price, :date, 'field', 'whatsapp', 1)
                            ON CONFLICT (commodity, region, price_date, data_origin)
                            DO UPDATE SET price = EXCLUDED.price,
                                          updated_at = now()
                        """),
                        {
                            "commodity": r["commodity"],
                            "region": r["region"],
                            "price": r["price"],
                            "date": today,
                        },
                    )
                    confirmations.append(
                        f"✅ {r['label']} · {r['region']} · {int(r['price'])} CFA/kg"
                    )
                await db.commit()

            date_str = today.strftime("%d/%m/%Y")
            token = getattr(settings, "whatsapp_access_token", "")
            phone_number_id = getattr(settings, "whatsapp_phone_number_id", "")
            base_url = getattr(settings, "whatsapp_graph_api_url", "https://graph.facebook.com/v25.0").rstrip("/")

            for r in relevés:
                try:
                    import httpx as _httpx
                    _httpx.post(
                        f"{base_url}/{phone_number_id}/messages",
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                        json={
                            "messaging_product": "whatsapp",
                            "to": from_number,
                            "type": "template",
                            "template": {
                                "name": "confirmation_releve_fasodata",
                                "language": {"code": "fr"},
                                "components": [{
                                    "type": "body",
                                    "parameters": [
                                        {"type": "text", "text": r["label"]},
                                        {"type": "text", "text": r["region"]},
                                        {"type": "text", "text": str(int(r["price"]))},
                                        {"type": "text", "text": date_str},
                                    ],
                                }],
                            },
                        },
                        timeout=15,
                    ).raise_for_status()
                except Exception:
                    # Fallback texte brut si template pas encore approuvé
                    reply = "\n".join(confirmations)
                    reply += f"\n\nMerci ! Données enregistrées le {date_str}. 🌾 FasoData"
                    send_whatsapp_text(to_number=from_number, message=reply, settings=settings)
                    break

    except Exception as exc:
        logger.error("Erreur traitement webhook WA : %s", exc, exc_info=True)

    # Meta exige toujours 200
    return {"status": "ok"}
