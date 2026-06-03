"""
Tâches Celery — Alertes prix email.

  check_price_alerts : Exécuté 3×/jour (8h, 14h, 20h)
                       Vérifie tous les abonnements actifs et envoie les alertes.
"""

import logging
from datetime import date, datetime, timedelta, timezone

from celery import shared_task

from fasodata.core.celery_app import celery_app

logger = logging.getLogger(__name__)

# Intervalle minimum entre deux alertes pour le même abonnement (heures)
MIN_HOURS_BETWEEN_ALERTS = 12


@celery_app.task(name="fasodata.alerts.tasks.check_price_alerts", bind=True)
def check_price_alerts(self):
    """
    Vérifie tous les abonnements actifs + confirmés.
    Pour chaque abonnement, récupère le dernier prix en DB et
    envoie un email si : prix > seuil ET pas d'alerte récente.

    Planifié à 8h00, 14h00 et 20h00 WAT via Celery Beat.
    """
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import sessionmaker

    from fasodata.alerts.email_service import send_price_alert_email
    from fasodata.alerts.models import AlertSubscription
    from fasodata.alerts.whatsapp_service import send_price_alert_whatsapp
    from fasodata.core.config import get_settings
    from fasodata.prices.models import PriceData

    settings  = get_settings()
    sync_url  = settings.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    engine    = create_engine(sync_url, pool_pre_ping=True)
    Session   = sessionmaker(bind=engine)

    sent_count    = 0
    skipped_count = 0
    error_count   = 0

    try:
        with Session() as session:
            # Récupérer tous les abonnements actifs + confirmés
            subs = session.execute(
                select(AlertSubscription)
                .where(
                    AlertSubscription.is_active    == True,
                    AlertSubscription.is_confirmed == True,
                )
            ).scalars().all()

            if not subs:
                logger.info("[ALERTS] Aucun abonnement actif")
                return {"sent": 0, "skipped": 0}

            logger.info(f"[ALERTS] {len(subs)} abonnements à vérifier")

            # Cache des prix (commodity, region) → price pour éviter N requêtes
            price_cache: dict[tuple, float] = {}

            for sub in subs:
                cache_key = (sub.commodity, sub.region)

                # Récupérer le prix depuis le cache ou la DB
                if cache_key not in price_cache:
                    latest = session.execute(
                        select(PriceData)
                        .where(
                            PriceData.commodity == sub.commodity,
                            PriceData.region    == sub.region,
                            PriceData.validation_status.in_(["auto", "validated", "aggregated"]),
                        )
                        .order_by(PriceData.price_date.desc())
                        .limit(1)
                    ).scalar_one_or_none()

                    price_cache[cache_key] = latest.price if latest else 0.0

                current_price = price_cache[cache_key]

                if current_price <= 0:
                    skipped_count += 1
                    continue

                # Vérifier si le seuil est dépassé
                if current_price <= sub.threshold_price:
                    skipped_count += 1
                    continue

                # Éviter les alertes trop fréquentes
                if sub.last_alerted_at:
                    hours_since = (datetime.now(timezone.utc) - sub.last_alerted_at).total_seconds() / 3600
                    if hours_since < MIN_HOURS_BETWEEN_ALERTS:
                        skipped_count += 1
                        continue

                # Ne pas ré-alerter si le prix n'a pas changé significativement
                if sub.last_price_alerted and abs(current_price - sub.last_price_alerted) < 5:
                    skipped_count += 1
                    continue

                # Construire l'URL de désabonnement
                base_url      = settings.public_app_base_url
                unsubscribe   = f"{base_url}/api/alerts/unsubscribe/{sub.token}"

                # Envoyer l'email
                email_ok = send_price_alert_email(
                    to_email       = sub.email,
                    commodity      = sub.commodity,
                    region         = sub.region,
                    current_price  = current_price,
                    threshold      = sub.threshold_price,
                    unsubscribe_url= unsubscribe,
                    settings       = settings,
                )

                whatsapp_ok = False
                if sub.whatsapp_number:
                    whatsapp_ok = send_price_alert_whatsapp(
                        to_number       = sub.whatsapp_number,
                        commodity       = sub.commodity,
                        region          = sub.region,
                        current_price   = current_price,
                        threshold       = sub.threshold_price,
                        unsubscribe_url = unsubscribe,
                        settings        = settings,
                    )

                ok = email_ok or whatsapp_ok
                if ok:
                    sub.last_alerted_at    = datetime.now(timezone.utc)
                    sub.last_price_alerted = current_price
                    sub.alert_count       += 1
                    sent_count += 1
                    logger.info(
                        f"[ALERT SENT] {sub.email} | {sub.commodity}/{sub.region} "
                        f"{current_price} CFA > seuil {sub.threshold_price}"
                    )
                else:
                    error_count += 1

            session.commit()

    except Exception as e:
        logger.error(f"check_price_alerts error: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=600, max_retries=2)
    finally:
        engine.dispose()

    result = {"sent": sent_count, "skipped": skipped_count, "errors": error_count}
    logger.info(f"[ALERTS] Résultat : {result}")
    return result


@celery_app.task(name="fasodata.alerts.tasks.send_confirmation_email_task")
def send_confirmation_email_task(
    to_email: str,
    confirm_url: str,
    unsubscribe_url: str,
    commodity: str,
    region: str,
    threshold: float,
):
    """Envoie l'email de confirmation d'abonnement (via Celery pour ne pas bloquer la requête API)."""
    from fasodata.alerts.email_service import send_confirmation_email
    from fasodata.core.config import get_settings

    settings = get_settings()
    ok = send_confirmation_email(
        to_email        = to_email,
        confirm_url     = confirm_url,
        unsubscribe_url = unsubscribe_url,
        commodity       = commodity,
        region          = region,
        threshold       = threshold,
        settings        = settings,
    )
    return {"sent": ok, "to": to_email}
