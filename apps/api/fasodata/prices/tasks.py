"""
Tâches Celery — Prix alimentaires.

Tasks :
  aggregate_daily_sms     : Agrégation nocturne (23h00 WAT) des SMS du jour
  auto_validate_sms_price : Auto-validation d'un relevé SMS (appelé à la réception)
  send_anomaly_alert      : Envoie une alerte SMS si un prix est anormal
"""

import logging
import statistics
from datetime import date, datetime, timedelta, timezone

from celery import shared_task

from fasodata.core.celery_app import celery_app

logger = logging.getLogger(__name__)

# ── Seuils d'anomalie par produit ─────────────────────────────────────────────
# Si le prix soumis par SMS est X% au-dessus ou en-dessous de la moyenne
# des 30 derniers jours → flaggé "pending" pour revue admin
ANOMALY_THRESHOLD_PCT = 40   # >40% d'écart = suspect
MIN_HISTORICAL_RECORDS = 3   # nombre min de records historiques pour comparer


def _get_sync_session():
    """Crée une session synchrone SQLAlchemy (pour les tâches Celery)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from fasodata.core.config import get_settings

    settings = get_settings()
    # Remplacer asyncpg par psycopg2 pour la session sync Celery
    sync_url = settings.database_url.replace(
        "postgresql+asyncpg://", "postgresql+psycopg2://"
    )
    engine = create_engine(sync_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session(), engine


def _build_national_price_records(records):
    from fasodata.prices.wfp_service import WfpPriceRecord

    grouped: dict[tuple[str, date, str, str], list[WfpPriceRecord]] = {}
    for record in records:
        if record.price <= 0 or record.region == "National":
            continue
        grouped.setdefault(
            (record.commodity, record.price_date, record.unit, record.provider),
            [],
        ).append(record)

    national_records: list[WfpPriceRecord] = []
    for (commodity, price_date, unit, provider), items in grouped.items():
        markets = {item.market for item in items if item.market}
        if len(items) < 2:
            continue
        avg_price = round(sum(item.price for item in items) / len(items), 1)
        raw_names = sorted({item.raw_commodity for item in items if item.raw_commodity})
        national_records.append(
            WfpPriceRecord(
                commodity=commodity,
                region="National",
                market=None,
                price=avg_price,
                unit=unit,
                quality="moyenne nationale",
                price_date=price_date,
                raw_commodity=raw_names[0] if raw_names else commodity,
                raw_id=f"aggregate:national:{commodity}:{price_date.isoformat()}",
                provider=provider,
                n_obs=len(items),
                notes_suffix=f"moyenne nationale calculee depuis {len(markets) or len(items)} marches",
            )
        )
    return national_records


@celery_app.task(name="fasodata.prices.tasks.fetch_wfp_prices", bind=True)
def fetch_wfp_prices(
    self,
    start_date_str: str | None = None,
    end_date_str: str | None = None,
):
    """Recupere les prix WFP/HDX et les upsert dans price_data."""
    from sqlalchemy import select

    from fasodata.core.config import get_settings
    from fasodata.prices.models import PriceData
    from fasodata.prices.wfp_service import WfpCredentialsError, fetch_wfp_burkina_prices

    settings = get_settings()
    end_date = date.fromisoformat(end_date_str) if end_date_str else date.today()
    start_date = (
        date.fromisoformat(start_date_str)
        if start_date_str
        else end_date - timedelta(days=settings.wfp_prices_lookback_days)
    )

    logger.info("[WFP] Synchronisation des prix %s -> %s", start_date, end_date)

    try:
        records = fetch_wfp_burkina_prices(start_date=start_date, end_date=end_date)
    except WfpCredentialsError as exc:
        logger.warning("[WFP] Synchronisation ignoree: %s", exc)
        return {
            "status": "disabled",
            "reason": str(exc),
            "created": 0,
            "updated": 0,
            "skipped": 0,
        }
    except Exception as exc:
        logger.error("[WFP] Erreur pendant le fetch", exc_info=True)
        raise self.retry(exc=exc, countdown=600, max_retries=3)

    session, engine = _get_sync_session()
    created = 0
    updated = 0
    skipped = 0

    try:
        all_records = [*records, *_build_national_price_records(records)]

        for record in all_records:
            if record.price <= 0:
                skipped += 1
                continue

            existing = session.execute(
                select(PriceData).where(
                    PriceData.source == "wfp",
                    PriceData.commodity == record.commodity,
                    PriceData.region == record.region,
                    PriceData.market == record.market,
                    PriceData.price_date == record.price_date,
                )
            ).scalar_one_or_none()

            notes = f"{record.provider}; commodity={record.raw_commodity}"
            if record.raw_id:
                notes = f"{notes}; id={record.raw_id}"
            if record.notes_suffix:
                notes = f"{notes}; {record.notes_suffix}"

            if existing:
                existing.price = record.price
                existing.unit = record.unit
                existing.quality = record.quality
                existing.reporter = record.provider
                existing.data_origin = "public"
                existing.n_obs = record.n_obs
                existing.notes = notes
                existing.validation_status = "auto"
                updated += 1
            else:
                session.add(
                    PriceData(
                        commodity=record.commodity,
                        region=record.region,
                        market=record.market,
                        price=record.price,
                        unit=record.unit,
                        quality=record.quality,
                        price_date=record.price_date,
                        source="wfp",
                        data_origin="public",
                        reporter=record.provider,
                        n_obs=record.n_obs,
                        notes=notes,
                        validation_status="auto",
                    )
                )
                created += 1

        session.commit()
        summary = {
            "status": "ok",
            "country": settings.wfp_country_code,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "fetched": len(records),
            "national_aggregates": len(all_records) - len(records),
            "created": created,
            "updated": updated,
            "skipped": skipped,
        }
        logger.info("[WFP] Synchronisation terminee: %s", summary)
        return summary
    except Exception as exc:
        session.rollback()
        logger.error("[WFP] Erreur pendant l'upsert", exc_info=True)
        raise self.retry(exc=exc, countdown=600, max_retries=3)
    finally:
        session.close()
        engine.dispose()


# ══════════════════════════════════════════════════════════════════════════════
# TÂCHE 1 : Auto-validation d'un relevé SMS à la réception
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(name="fasodata.prices.tasks.auto_validate_sms_price", bind=True)
def auto_validate_sms_price(self, price_id: str):
    """
    Appelée juste après l'insertion d'un relevé SMS.
    Compare le prix au historique récent (30 jours) et décide :
      - "validated"  : prix dans la plage normale (±40%)
      - "pending"    : prix suspect, envoi alerte admin
    """
    from fasodata.prices.models import PriceData
    from sqlalchemy import select, and_

    session, engine = _get_sync_session()
    try:
        row = session.get(PriceData, price_id)
        if not row:
            logger.warning(f"auto_validate_sms_price: PriceData {price_id} introuvable")
            return

        # Historique des 30 derniers jours pour ce produit et cette région
        cutoff = date.today() - timedelta(days=30)
        historical = session.execute(
            select(PriceData.price)
            .where(
                PriceData.commodity == row.commodity,
                PriceData.region    == row.region,
                PriceData.price_date >= cutoff,
                PriceData.id        != row.id,
                PriceData.validation_status.in_(["auto", "validated", "aggregated"]),
            )
        ).scalars().all()

        if len(historical) < MIN_HISTORICAL_RECORDS:
            # Pas assez d'historique → validation automatique par défaut
            row.validation_status = "validated"
            row.anomaly_score     = None
            session.commit()
            logger.info(f"[AUTO-VAL] {row.commodity}/{row.region} {row.price} CFA — peu d'historique → validé")
            return

        mean_price = statistics.mean(historical)
        deviation_pct = abs((row.price - mean_price) / mean_price) * 100

        if deviation_pct <= ANOMALY_THRESHOLD_PCT:
            row.validation_status = "validated"
            row.anomaly_score     = round(deviation_pct)
            session.commit()
            logger.info(
                f"[AUTO-VAL] {row.commodity}/{row.region} {row.price} CFA "
                f"(moy={mean_price:.0f}, écart={deviation_pct:.1f}%) → validé"
            )
        else:
            # Prix suspect → en attente de revue admin
            row.validation_status = "pending"
            row.anomaly_score     = round(deviation_pct)
            session.commit()
            logger.warning(
                f"[ANOMALIE] {row.commodity}/{row.region} {row.price} CFA "
                f"(moy={mean_price:.0f}, écart={deviation_pct:.1f}%) → pending"
            )
            # Alerte admin par SMS
            _notify_admin_anomaly.delay(
                commodity=row.commodity,
                region=row.region,
                price=row.price,
                mean_price=round(mean_price),
                deviation_pct=round(deviation_pct),
                reporter=row.reporter or "inconnu",
            )

    except Exception as e:
        logger.error(f"auto_validate_sms_price error: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=60, max_retries=3)
    finally:
        session.close()
        engine.dispose()


# ══════════════════════════════════════════════════════════════════════════════
# TÂCHE 2 : Agrégation nocturne quotidienne
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(name="fasodata.prices.tasks.aggregate_daily_sms", bind=True)
def aggregate_daily_sms(self, target_date_str: str | None = None):
    """
    Agrège les relevés SMS de la journée en un seul enregistrement par
    (commodity, region, date) — planifié à 23h00 WAT via Celery Beat.

    Algorithme :
      1. Récupérer tous les relevés SMS validés/auto-validés du jour
      2. Grouper par (commodity, region)
      3. Calculer : moyenne pondérée, min, max, écart-type
      4. Insérer un enregistrement agrégé (source="aggregated", n_obs=count)
      5. Marquer les relevés originaux comme "aggregated"
      6. Renvoyer un résumé
    """
    import statistics as stats
    from fasodata.prices.models import PriceData
    from sqlalchemy import select

    target_date = (
        date.fromisoformat(target_date_str) if target_date_str else date.today()
    )

    logger.info(f"[AGGREGATION] Démarrage pour le {target_date}")
    session, engine = _get_sync_session()
    results = []

    try:
        # Récupérer les SMS validés du jour (pas encore agrégés)
        sms_rows = session.execute(
            select(PriceData)
            .where(
                PriceData.source == "sms",
                PriceData.price_date == target_date,
                PriceData.validation_status.in_(["validated"]),
            )
            .order_by(PriceData.commodity, PriceData.region)
        ).scalars().all()

        if not sms_rows:
            logger.info(f"[AGGREGATION] Aucun relevé SMS validé pour le {target_date}")
            return {"date": str(target_date), "aggregated": 0, "groups": []}

        # Grouper par (commodity, region)
        groups: dict[tuple, list[PriceData]] = {}
        for row in sms_rows:
            key = (row.commodity, row.region)
            groups.setdefault(key, []).append(row)

        for (commodity, region), rows in groups.items():
            prices = [r.price for r in rows]
            mean_p = round(statistics.mean(prices), 1)
            min_p  = min(prices)
            max_p  = max(prices)
            n      = len(prices)
            std_p  = round(statistics.stdev(prices), 1) if n > 1 else 0.0

            # Insérer l'enregistrement agrégé
            agg = PriceData(
                commodity=commodity,
                region=region,
                price=mean_p,
                price_date=target_date,
                source="aggregated",
                data_origin="field",
                quality="agrégé SMS",
                n_obs=n,
                validation_status="auto",
                notes=(
                    f"Agrégat quotidien du {target_date} · "
                    f"n={n} relevés · min={min_p} max={max_p} std={std_p}"
                ),
            )
            session.add(agg)

            # Marquer les sources comme agrégées
            for r in rows:
                r.validation_status = "aggregated"

            results.append({
                "commodity": commodity,
                "region":    region,
                "mean":      mean_p,
                "min":       min_p,
                "max":       max_p,
                "n_obs":     n,
                "std":       std_p,
            })

            logger.info(
                f"[AGGREGATION] {commodity}/{region}: {n} relevés → "
                f"moyenne {mean_p} CFA/kg (min={min_p}, max={max_p})"
            )

        session.commit()
        summary = {
            "date":       str(target_date),
            "aggregated": len(results),
            "groups":     results,
            "total_sms":  len(sms_rows),
        }
        logger.info(f"[AGGREGATION] Terminé : {len(results)} groupes traités")
        return summary

    except Exception as e:
        session.rollback()
        logger.error(f"aggregate_daily_sms error: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=300, max_retries=2)
    finally:
        session.close()
        engine.dispose()


# ══════════════════════════════════════════════════════════════════════════════
# TÂCHE 3 : Notification admin — anomalie détectée
# ══════════════════════════════════════════════════════════════════════════════

@celery_app.task(name="fasodata.prices.tasks.notify_admin_anomaly")
def _notify_admin_anomaly(
    commodity: str,
    region: str,
    price: float,
    mean_price: float,
    deviation_pct: float,
    reporter: str,
):
    """Notifie les admins d'un prix SMS suspect par SMS (si AT configuré)."""
    from fasodata.prices import at_service
    from fasodata.core.config import get_settings

    settings = get_settings()

    COMMODITY_LABELS_FR = {
        "sorghum": "Sorgho", "rice_local": "Riz local", "rice_imported": "Riz importé",
        "maize": "Maïs", "millet": "Mil",
        "cowpea": "Niébé", "groundnut": "Arachide",
    }
    label = COMMODITY_LABELS_FR.get(commodity, commodity)

    message = (
        f"⚠️ FasoData — PRIX SUSPECT\n"
        f"{label} · {region}\n"
        f"Prix reçu : {int(price)} CFA/kg\n"
        f"Moyenne 30j : {int(mean_price)} CFA/kg\n"
        f"Écart : {deviation_pct:.0f}%\n"
        f"Enquêteur : {reporter}\n"
        f"→ admin.fasodata.bf/prix pour valider"
    )

    # Envoyer à l'admin configuré (shortcode ou numéro admin)
    admin_number = settings.at_shortcode
    if admin_number:
        at_service.send_sms([admin_number], message)
    else:
        logger.info(f"[ANOMALIE-NOTIF] {message}")
