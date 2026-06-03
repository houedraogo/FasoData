"""Envoi WhatsApp pour les alertes prix FasoData."""

from __future__ import annotations

import logging
import re
from typing import Any

import httpx

logger = logging.getLogger(__name__)

COMMODITY_LABELS_FR = {
    "sorghum": "Sorgho",
    "rice_local": "Riz local",
    "maize": "Mais",
    "millet": "Mil",
    "cowpea": "Niebe",
    "groundnut": "Arachide",
}


def normalize_whatsapp_number(value: str | None) -> str | None:
    """Retourne un numero international sans +, ou None si absent."""
    if not value:
        return None
    number = re.sub(r"[^\d+]", "", value.strip())
    if number.startswith("+"):
        number = number[1:]
    if number.startswith("00"):
        number = number[2:]
    if len(number) < 8:
        return None
    return number


def build_price_alert_whatsapp_message(
    *,
    commodity: str,
    region: str,
    current_price: float,
    threshold: float,
    unsubscribe_url: str,
) -> str:
    label = COMMODITY_LABELS_FR.get(commodity, commodity)
    diff = current_price - threshold
    pct = round((diff / threshold) * 100, 1)
    return (
        "Alerte prix FasoData\n"
        f"{label} - {region}\n"
        f"Prix actuel : {int(current_price)} CFA/kg\n"
        f"Seuil : {int(threshold)} CFA/kg (+{pct}%)\n"
        f"Desabonnement : {unsubscribe_url}"
    )


def send_whatsapp_text(
    *,
    to_number: str | None,
    message: str,
    settings: Any,
) -> bool:
    recipient = normalize_whatsapp_number(to_number)
    if not recipient:
        logger.info("[WHATSAPP-SKIP] Aucun numero WhatsApp valide")
        return False

    enabled = bool(getattr(settings, "whatsapp_enabled", True))
    token = getattr(settings, "whatsapp_access_token", "")
    phone_number_id = getattr(settings, "whatsapp_phone_number_id", "")
    base_url = getattr(settings, "whatsapp_graph_api_url", "https://graph.facebook.com/v25.0").rstrip("/")

    if not enabled or not token or not phone_number_id:
        logger.info(
            "[WHATSAPP-SIMULATION]\n  To: %s\n  Message:\n%s",
            recipient,
            message,
        )
        return True

    try:
        response = httpx.post(
            f"{base_url}/{phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "text",
                "text": {"preview_url": False, "body": message},
            },
            timeout=15,
        )
        response.raise_for_status()
        logger.info("[WHATSAPP-SENT] %s", recipient)
        return True
    except Exception as exc:
        logger.error("[WHATSAPP-ERROR] %s: %s", recipient, exc)
        return False


def send_price_alert_whatsapp(
    *,
    to_number: str | None,
    commodity: str,
    region: str,
    current_price: float,
    threshold: float,
    unsubscribe_url: str,
    settings: Any,
) -> bool:
    message = build_price_alert_whatsapp_message(
        commodity=commodity,
        region=region,
        current_price=current_price,
        threshold=threshold,
        unsubscribe_url=unsubscribe_url,
    )
    return send_whatsapp_text(to_number=to_number, message=message, settings=settings)
