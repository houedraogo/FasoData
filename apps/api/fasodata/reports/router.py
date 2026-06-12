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
    "rice_local": "Riz local", "rice_imported": "Riz importé", "cowpea": "Niébé", "groundnut": "Arachide",
}
REGIONS_ORDER = [
    "Sahel", "Est", "Nord", "Centre-Nord", "Boucle du Mouhoun",
    "Centre", "Plateau Central", "Centre-Est", "Centre-Ouest",
    "Centre-Sud", "Hauts-Bassins", "Cascades", "Sud-Ouest", "National",
]


class ExportRequest(BaseModel):
    filters: dict | None = None


# ── Export CSV dataset (synchrone — stream direct) ────────────────────────────

@router.post("/{dataset_id}/export/csv")
async def export_csv(
    dataset_id: uuid.UUID,
    body: ExportRequest = ExportRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Exporte un dataset en CSV et le retourne directement en streaming.
    - Dataset avec s3_key : lit depuis MinIO
    - Dataset prix (slug prix-*) : génère depuis price_data
    - Autres datasets seedés sans s3_key : génère depuis les métadonnées
    """
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    import csv as csv_mod
    output = []

    # ── Cas 1 : fichier physique dans MinIO ──────────────────────────────────
    if dataset.s3_key:
        try:
            from minio import Minio
            import io as _io
            client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
            )
            resp = client.get_object(settings.minio_bucket, dataset.s3_key)
            content = resp.read()
            resp.close(); resp.release_conn()
            dataset.download_count += 1

            filename = f"export-{dataset.slug}.csv"
            return Response(
                content=content,
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Length": str(len(content)),
                },
            )
        except Exception as e:
            raise HTTPException(500, f"Erreur lecture MinIO : {e}")

    # ── Cas 2 : dataset prix → générer depuis price_data ────────────────────
    is_price_dataset = (
        "prix" in (dataset.slug or "").lower() or
        "price" in (dataset.category or "").lower() or
        dataset.slug == "prix-alimentaires-burkina-faso"
    )
    if is_price_dataset:
        rows_q = (await db.execute(
            select(PriceData)
            .order_by(PriceData.price_date.desc(), PriceData.commodity)
            .limit(10_000)
        )).scalars().all()

        import io as _io, csv as _csv
        buf = _io.StringIO()
        writer = _csv.writer(buf)
        writer.writerow(["pays", "commodity", "region", "marche", "prix", "unite",
                          "qualite", "date", "source", "statut_validation", "date_creation"])
        for r in rows_q:
            writer.writerow([
                r.country, r.commodity, r.region, r.market or "",
                r.price, r.unit, r.quality or "",
                r.price_date.isoformat(), r.source,
                r.validation_status, r.created_at.date().isoformat(),
            ])

        dataset.download_count += 1
        content = buf.getvalue().encode("utf-8-sig")  # BOM pour Excel
        filename = f"prix-alimentaires-fasodata-{date.today().isoformat()}.csv"
        return Response(
            content=content,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(content)),
            },
        )

    # ── Cas 3 : autres datasets seedés — métadonnées en CSV ─────────────────
    import io as _io, csv as _csv
    buf = _io.StringIO()
    writer = _csv.writer(buf)
    writer.writerow(["champ", "valeur"])
    writer.writerow(["nom", dataset.name])
    writer.writerow(["slug", dataset.slug])
    writer.writerow(["categorie", dataset.category or ""])
    writer.writerow(["source", dataset.source or ""])
    writer.writerow(["licence", dataset.license.value if hasattr(dataset.license, "value") else dataset.license])
    writer.writerow(["nb_lignes", dataset.row_count or 0])
    writer.writerow(["format", dataset.file_format or ""])
    writer.writerow(["statut", dataset.status.value if hasattr(dataset.status, "value") else dataset.status])
    writer.writerow(["cree_le", dataset.created_at.date().isoformat()])
    writer.writerow(["publie_le", dataset.published_at.date().isoformat() if dataset.published_at else ""])
    writer.writerow(["description", dataset.description or ""])
    writer.writerow(["", ""])
    writer.writerow(["note", "Les données brutes de ce dataset ne sont pas encore disponibles en téléchargement direct."])
    writer.writerow(["contact", "contact@fasodata.com"])

    content = buf.getvalue().encode("utf-8-sig")
    filename = f"metadata-{dataset.slug}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
