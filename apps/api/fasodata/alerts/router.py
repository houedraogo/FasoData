"""
API des alertes prix email.

  POST /api/alerts/subscribe             — s'abonner (envoie confirmation)
  GET  /api/alerts/confirm/{token}       — confirmer l'abonnement
  GET  /api/alerts/unsubscribe/{token}   — se désabonner
  GET  /api/alerts/status                — statut global (admin)
  GET  /api/alerts/subscriptions         — liste des abonnements (admin)
  POST /api/alerts/trigger-check         — lancer la vérification manuellement (admin)
  DELETE /api/alerts/subscriptions/{id}  — supprimer un abonnement (admin)
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.auth.deps import require_admin
from fasodata.core.config import get_settings
from fasodata.core.database import get_db
from fasodata.alerts.models import AlertSubscription
from fasodata.alerts.schemas import SubscribeOut, SubscribeRequest, SubscriptionUpdate
from fasodata.users.models import User

router   = APIRouter(prefix="/api/alerts", tags=["alerts"])
settings = get_settings()


def _base_url() -> str:
    return settings.public_app_base_url


# ── Abonnement ─────────────────────────────────────────────────────────────────

@router.post("/subscribe", response_model=SubscribeOut, status_code=201)
async def subscribe(
    payload: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    S'abonner à une alerte prix.
    Un email de confirmation est envoyé (double opt-in RGPD).
    L'abonnement n'est actif qu'après confirmation.
    """
    # Vérifier si un abonnement identique existe déjà
    existing = await db.execute(
        select(AlertSubscription).where(
            AlertSubscription.email     == payload.email,
            AlertSubscription.commodity == payload.commodity,
            AlertSubscription.region    == payload.region,
        )
    )
    sub = existing.scalar_one_or_none()

    if sub:
        if sub.is_confirmed and sub.is_active:
            raise HTTPException(409, "Un abonnement identique existe déjà pour cet email.")
        # Réactivation ou renvoi de confirmation
        sub.threshold_price = payload.threshold_price
        sub.whatsapp_number = payload.whatsapp_number
        sub.is_active       = False
        sub.is_confirmed    = False
    else:
        sub = AlertSubscription(
            email           = payload.email,
            whatsapp_number = payload.whatsapp_number,
            commodity       = payload.commodity,
            region          = payload.region,
            threshold_price = payload.threshold_price,
        )
        db.add(sub)

    await db.flush()
    await db.refresh(sub)

    # Envoyer l'email de confirmation (via Celery)
    confirm_url     = f"{_base_url()}/api/alerts/confirm/{sub.token}"
    unsubscribe_url = f"{_base_url()}/api/alerts/unsubscribe/{sub.token}"

    try:
        from fasodata.alerts.tasks import send_confirmation_email_task
        send_confirmation_email_task.apply_async(
            kwargs={
                "to_email":       payload.email,
                "confirm_url":    confirm_url,
                "unsubscribe_url":unsubscribe_url,
                "commodity":      payload.commodity,
                "region":         payload.region,
                "threshold":      payload.threshold_price,
            },
            queue="default",
        )
    except Exception as e:
        import logging; logging.getLogger(__name__).warning(f"Celery unavailable: {e}")

    return SubscribeOut.model_validate(sub)


# ── Confirmation email ─────────────────────────────────────────────────────────

@router.get("/confirm/{token}", response_class=HTMLResponse)
async def confirm_subscription(token: str, db: AsyncSession = Depends(get_db)):
    """Confirme l'abonnement via le lien envoyé par email."""
    result = await db.execute(select(AlertSubscription).where(AlertSubscription.token == token))
    sub    = result.scalar_one_or_none()

    if not sub:
        return HTMLResponse(_page("Lien invalide", "Ce lien de confirmation n'existe pas ou a expiré.", "#E04E2F"), status_code=404)

    sub.is_confirmed  = True
    sub.is_active     = True
    sub.confirmed_at  = datetime.now(timezone.utc)
    await db.flush()

    commodity_labels = {
        "sorghum": "Sorgho", "rice_local": "Riz local", "rice_imported": "Riz importé",
        "maize": "Maïs", "millet": "Mil",
        "cowpea": "Niébé", "groundnut": "Arachide",
    }
    label = commodity_labels.get(sub.commodity, sub.commodity)

    return HTMLResponse(_page(
        "Abonnement confirmé ! ✅",
        f"Vous recevrez une alerte par email quand le prix du <strong>{label}</strong> "
        f"en <strong>{sub.region}</strong> dépasse <strong style='color:#E04E2F'>{int(sub.threshold_price)} CFA/kg</strong>.",
        "#16A34A"
    ))


# ── Désabonnement ─────────────────────────────────────────────────────────────

@router.get("/unsubscribe/{token}", response_class=HTMLResponse)
async def unsubscribe(token: str, db: AsyncSession = Depends(get_db)):
    """Désactive l'abonnement via le lien dans l'email."""
    result = await db.execute(select(AlertSubscription).where(AlertSubscription.token == token))
    sub    = result.scalar_one_or_none()

    if not sub:
        return HTMLResponse(_page("Lien invalide", "Ce lien n'existe pas ou a déjà été utilisé.", "#E04E2F"), status_code=404)

    sub.is_active = False
    await db.flush()

    return HTMLResponse(_page(
        "Désabonnement effectué",
        "Vous ne recevrez plus d'alertes pour cet abonnement. Merci d'avoir utilisé FasoData.",
        "#6b7280"
    ))


# ── Statut (public) ────────────────────────────────────────────────────────────

@router.get("/status")
async def alert_status(db: AsyncSession = Depends(get_db)):
    """Statistiques globales des alertes (publiques)."""
    total   = (await db.execute(select(func.count(AlertSubscription.id)))).scalar_one()
    active  = (await db.execute(
        select(func.count(AlertSubscription.id))
        .where(AlertSubscription.is_active == True, AlertSubscription.is_confirmed == True)
    )).scalar_one()
    pending = (await db.execute(
        select(func.count(AlertSubscription.id))
        .where(AlertSubscription.is_confirmed == False)
    )).scalar_one()

    smtp_ok = bool(getattr(settings, "smtp_host", "") and getattr(settings, "smtp_user", ""))
    whatsapp_ok = bool(
        getattr(settings, "whatsapp_enabled", True)
        and getattr(settings, "whatsapp_access_token", "")
        and getattr(settings, "whatsapp_phone_number_id", "")
    )

    return {
        "total_subscriptions":  total,
        "active_confirmed":     active,
        "pending_confirmation": pending,
        "smtp_configured":      smtp_ok,
        "smtp_mode":            "SMTP réel" if smtp_ok else "Simulation (logs)",
        "whatsapp_configured":  whatsapp_ok,
        "whatsapp_mode":        "WhatsApp Cloud API" if whatsapp_ok else "Simulation (logs)",
        "check_schedule":       "8h00 · 14h00 · 20h00 WAT",
    }


# ── Admin ──────────────────────────────────────────────────────────────────────

@router.get("/subscriptions")
async def list_subscriptions(
    page:      int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    active:    bool | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Liste des abonnements (admin)."""
    q = select(AlertSubscription)
    if active is not None:
        q = q.where(AlertSubscription.is_active == active)

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total   = total_r.scalar_one()

    q = q.order_by(AlertSubscription.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result  = await db.execute(q)
    items   = result.scalars().all()

    return {
        "items":     [SubscribeOut.model_validate(r) for r in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    }


@router.delete("/subscriptions/{sub_id}", status_code=204)
async def delete_subscription(
    sub_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Supprimer un abonnement (admin)."""
    result = await db.execute(select(AlertSubscription).where(AlertSubscription.id == sub_id))
    sub    = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404)
    await db.delete(sub)


@router.patch("/subscriptions/{sub_id}", response_model=SubscribeOut)
async def update_subscription(
    sub_id: uuid.UUID,
    payload: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Modifier un abonnement email (admin)."""
    result = await db.execute(select(AlertSubscription).where(AlertSubscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, detail="Abonnement introuvable")

    values = payload.model_dump(exclude_none=True)
    if values.get("is_confirmed") and not sub.confirmed_at:
        sub.confirmed_at = datetime.now(timezone.utc)
    for field, value in values.items():
        setattr(sub, field, value)
    return SubscribeOut.model_validate(sub)


@router.post("/trigger-check")
async def trigger_check(current_user: User = Depends(require_admin)):
    """Lancer manuellement la vérification des alertes (admin)."""
    from fasodata.alerts.tasks import check_price_alerts
    task = check_price_alerts.apply_async(queue="default")
    return {"status": "queued", "task_id": task.id, "message": "Vérification en cours..."}


# ── Template HTML réponse ─────────────────────────────────────────────────────

def _page(title: str, message: str, color: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>{title} — FasoData</title>
<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{font-family:-apple-system,sans-serif;background:#f4f5f7;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}}.card{{background:white;border-radius:20px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08)}}.icon{{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;background:{color}20}}.icon svg{{width:32px;height:32px;color:{color}}}h1{{color:#111;font-size:22px;margin-bottom:12px}}p{{color:#6b7280;line-height:1.6;font-size:14px;margin-bottom:28px}}a{{display:inline-block;background:#1A2C42;color:white;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px}}</style>
</head>
<body><div class="card">
  <div class="icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
  </div>
  <h1>{title}</h1>
  <p>{message}</p>
  <a href="https://fasodata.bf">← Retour à FasoData</a>
</div></body></html>"""
