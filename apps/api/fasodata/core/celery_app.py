from celery import Celery
from celery.schedules import crontab

from fasodata.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "fasodata",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "fasodata.ingest.tasks",
        "fasodata.reports.tasks",
        "fasodata.prices.tasks",      # SMS + agrégation
        "fasodata.alerts.tasks",      # Alertes email
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Ouagadougou",   # UTC+0 (même heure que WAT)
    enable_utc=True,
    task_track_started=True,
    task_routes={
        "fasodata.ingest.tasks.*":  {"queue": "imports"},
        "fasodata.reports.tasks.*": {"queue": "exports"},
        "fasodata.prices.tasks.*":  {"queue": "prices"},
        "*":                        {"queue": "default"},
    },
    # ── Planification Celery Beat ────────────────────────────────────────────
    beat_schedule={
        # Vérification des alertes prix 3×/jour (8h, 14h, 20h WAT)
        "check-price-alerts": {
            "task":     "fasodata.alerts.tasks.check_price_alerts",
            "schedule": crontab(hour="8,14,20", minute=0),
            "options":  {"queue": "default"},
        },
        # Agrégation des SMS quotidiens à 23h00 WAT (Africa/Ouagadougou)
        "aggregate-sms-daily-23h": {
            "task":     "fasodata.prices.tasks.aggregate_daily_sms",
            "schedule": crontab(hour=23, minute=0),
            "options":  {"queue": "prices"},
        },
        # Synchronisation WFP DataBridges chaque lundi matin.
        "fetch-wfp-prices-weekly": {
            "task":     "fasodata.prices.tasks.fetch_wfp_prices",
            "schedule": crontab(day_of_week="mon", hour=6, minute=15),
            "options":  {"queue": "prices"},
        },
    },
    beat_scheduler="celery.beat:PersistentScheduler",
    beat_schedule_filename="/tmp/celerybeat-schedule",  # persistance entre redémarrages
)
