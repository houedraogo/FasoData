import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from fasodata.auth.deps import get_current_active_user, require_institutional
from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset
from fasodata.prices.models import PriceData
from fasodata.reports.pdf import build_dataset_report_lines, build_text_pdf
from fasodata.reports.tasks import export_csv_task
from fasodata.users.models import User

router = APIRouter(prefix="/api/reports", tags=["reports"])

COMMODITY_LABELS = {
    "maize": "Maïs", "millet": "Mil", "sorghum": "Sorgho",
    "rice_local": "Riz local", "cowpea": "Niébé", "groundnut": "Arachide",
}
REGIONS_ORDER = [
    "Sahel", "Est", "Nord", "Centre-Nord", "Boucle du Mouhoun",
    "Centre", "Plateau Central", "Centre-Est", "Centre-Ouest",
    "Centre-Sud", "Hauts-Bassins", "Cascades", "Sud-Ouest", "National",
]


class ExportRequest(BaseModel):
    filters: dict | None = None


# ── Export CSV dataset ────────────────────────────────────────────────────────

@router.post("/{dataset_id}/export/csv")
async def export_csv(
    dataset_id: uuid.UUID,
    body: ExportRequest = ExportRequest(),
    current_user: User = Depends(require_institutional),
):
    task = export_csv_task.delay(str(dataset_id), body.filters)
    return {"task_id": task.id, "status": "queued"}


# ── Export PDF dataset ────────────────────────────────────────────────────────

@router.post("/{dataset_id}/export/pdf")
async def export_pdf(
    dataset_id: uuid.UUID,
    body: ExportRequest = ExportRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    lines = await build_dataset_report_lines(db, dataset)
    pdf_bytes = build_text_pdf(f"Rapport FasoData - {dataset.name}", lines)
    dataset.download_count += 1

    filename = f"rapport-{dataset.slug}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Rapport mensuel des prix alimentaires ─────────────────────────────────────

@router.post("/prix/pdf")
async def export_prix_pdf(
    country: str = Query("BFA", description="Code pays ISO3 : BFA, MLI, NER"),
    months: int  = Query(3,   ge=1, le=12, description="Nb mois d'historique"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Génère un rapport PDF des prix alimentaires par région."""
    since = date.today() - timedelta(days=months * 31)
    country_labels = {"BFA": "Burkina Faso", "MLI": "Mali", "NER": "Niger"}
    country_label  = country_labels.get(country, country)

    # Derniers prix par produit × région
    rows = (await db.execute(
        select(
            PriceData.commodity,
            PriceData.region,
            func.avg(PriceData.price).label("avg_price"),
            func.max(PriceData.price_date).label("last_date"),
            func.count(PriceData.id).label("nb_obs"),
        )
        .where(PriceData.country == country, PriceData.price_date >= since)
        .group_by(PriceData.commodity, PriceData.region)
        .order_by(PriceData.commodity, PriceData.region)
    )).all()

    # Statistiques globales
    stats = (await db.execute(
        select(
            func.count(PriceData.id).label("total"),
            func.min(PriceData.price_date).label("debut"),
            func.max(PriceData.price_date).label("fin"),
        )
        .where(PriceData.country == country, PriceData.price_date >= since)
    )).one()

    now_str = date.today().strftime("%d/%m/%Y")
    lines = [
        f"Généré le : {now_str}",
        f"Pays      : {country_label}  ({country})",
        f"Période   : {months} dernier(s) mois  "
        f"({stats.debut.isoformat() if stats.debut else '-'} → {stats.fin.isoformat() if stats.fin else '-'})",
        f"Données   : {int(stats.total or 0)} observations",
        "",
        "=" * 72,
        "PRIX MOYENS PAR PRODUIT ET PAR RÉGION  (CFA / kg ou litre)",
        "=" * 72,
        "",
    ]

    # Regrouper par produit
    by_commodity: dict[str, list] = {}
    for row in rows:
        by_commodity.setdefault(row.commodity, []).append(row)

    for commodity, commodity_rows in sorted(by_commodity.items()):
        label = COMMODITY_LABELS.get(commodity, commodity)
        lines.append(f"── {label.upper()} ──")
        # Trier par région
        sorted_rows = sorted(
            commodity_rows,
            key=lambda r: REGIONS_ORDER.index(r.region) if r.region in REGIONS_ORDER else 99
        )
        for r in sorted_rows:
            price_str = f"{round(r.avg_price):>6} CFA/kg"
            obs_str   = f"({int(r.nb_obs)} obs.)"
            lines.append(f"  {r.region:<22}  {price_str}   {obs_str}  dernier: {r.last_date.isoformat()}")
        lines.append("")

    lines += [
        "=" * 72,
        "NOTES",
        "=" * 72,
        "",
        "Source    : WFP VAM / SONAGESS Burkina Faso  (données FasoData)",
        "Unité     : Francs CFA par kilogramme (sauf mil / sorgho en sac)",
        "Méthode   : Moyenne des relevés terrain validés sur la période.",
        "Référence : https://fasodata.com/carte-prix",
        "",
        "Ce rapport est généré automatiquement depuis la base FasoData.",
        "Les données peuvent légèrement différer des sources officielles SONAGESS.",
    ]

    pdf_bytes = build_text_pdf(
        f"Rapport Prix Alimentaires — {country_label} ({months}M)",
        lines,
    )
    filename = f"prix-alimentaires-{country.lower()}-{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Statut tâches Celery ──────────────────────────────────────────────────────

@router.get("/tasks/{task_id}")
async def get_task_result(
    task_id: str,
    current_user: User = Depends(require_institutional),
):
    from fasodata.core.celery_app import celery_app
    result = celery_app.AsyncResult(task_id)
    if result.ready():
        return {"status": "done", "result": result.get()}
    return {"status": result.state.lower()}
