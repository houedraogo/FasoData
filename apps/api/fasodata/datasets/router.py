import io
import csv
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.auth.deps import get_current_active_user, require_admin, require_institutional
from fasodata.core.config import get_settings
from fasodata.core.data_origin import visible_origin_filter
from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset, DatasetLicense, DatasetStatus, ImportJob
from fasodata.datasets.schemas import (
    DatasetCreate,
    DatasetListOut,
    DatasetModerationRequest,
    DatasetOut,
    DatasetPreview,
    DatasetStats,
    DatasetUpdate,
    ImportJobOut,
)
from fasodata.ingest.tasks import import_csv_task
from fasodata.users.models import User

settings = get_settings()

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

PRICE_DATASET_SLUG = "prix-alimentaires-burkina-faso"
PRICE_DATASET_COLUMNS = [
    {"name": "commodity", "type": "string", "description": "Produit alimentaire normalise"},
    {"name": "region", "type": "string", "description": "Region administrative ou National"},
    {"name": "market", "type": "string", "description": "Marche de collecte"},
    {"name": "price", "type": "float", "description": "Prix observe"},
    {"name": "unit", "type": "string", "description": "Unite du prix"},
    {"name": "quality", "type": "string", "description": "Type ou qualite du prix"},
    {"name": "price_date", "type": "date", "description": "Date d'observation"},
    {"name": "source", "type": "string", "description": "Source de donnees"},
    {"name": "data_origin", "type": "string", "description": "Origine de confiance: public, field, user_upload, manual, seed ou simulation"},
    {"name": "reporter", "type": "string", "description": "Collecteur ou systeme source"},
    {"name": "validation_status", "type": "string", "description": "Statut de validation FasoData"},
    {"name": "notes", "type": "string", "description": "Notes techniques"},
]


def _ensure_dataset_can_be_reviewed(dataset: Dataset) -> None:
    if dataset.status not in (DatasetStatus.draft, DatasetStatus.pending):
        raise HTTPException(409, detail="Ce dataset n'est pas en attente de validation")


def make_unique_slug(base: str) -> str:
    return slugify(base)


def _visible_dataset_filters() -> list:
    origin_filter = visible_origin_filter(Dataset.data_origin, settings)
    return [origin_filter] if origin_filter is not None else []


def _visible_price_filters(price_model) -> list:
    origin_filter = visible_origin_filter(price_model.data_origin, settings)
    return [origin_filter] if origin_filter is not None else []


async def ensure_public_price_dataset(db: AsyncSession) -> Dataset:
    from fasodata.prices.models import PriceData

    now = datetime.now(timezone.utc)
    row_count = await db.scalar(
        select(func.count()).select_from(PriceData).where(*_visible_price_filters(PriceData))
    )
    result = await db.execute(select(Dataset).where(Dataset.slug == PRICE_DATASET_SLUG))
    dataset = result.scalar_one_or_none()

    if not dataset:
        dataset = Dataset(
            slug=PRICE_DATASET_SLUG,
            name="Prix alimentaires - Burkina Faso",
            published_at=now,
            data_origin="public",
        )
        db.add(dataset)

    dataset.description = (
        "Donnees publiques de suivi des prix alimentaires au Burkina Faso, "
        "issues de WFP DataBridges et des collectes terrain validees par FasoData."
    )
    dataset.category = "Agriculture"
    dataset.tags = ["prix", "cereales", "WFP", "Burkina Faso", "marches"]
    dataset.source = "WFP DataBridges; FasoData SMS"
    dataset.data_origin = "public"
    dataset.license = DatasetLicense.open
    dataset.status = DatasetStatus.published
    dataset.is_geo = False
    dataset.s3_key = None
    dataset.file_format = "csv"
    dataset.file_size_bytes = None
    dataset.row_count = int(row_count or 0)
    dataset.columns_meta = PRICE_DATASET_COLUMNS
    dataset.published_at = dataset.published_at or now
    dataset.updated_at = now
    await db.flush()
    return dataset


def _price_row_to_dict(row) -> dict:
    return {
        "commodity": row.commodity,
        "region": row.region,
        "market": row.market,
        "price": row.price,
        "unit": row.unit,
        "quality": row.quality,
        "price_date": row.price_date.isoformat(),
        "source": row.source,
        "data_origin": row.data_origin,
        "reporter": row.reporter,
        "validation_status": row.validation_status,
        "notes": row.notes,
    }


@router.get("/public-stats")
async def public_stats(db: AsyncSession = Depends(get_db)):
    """Stats publiques agrégées pour la homepage — pas d'auth requise."""
    await ensure_public_price_dataset(db)

    ds_q = select(Dataset).where(*_visible_dataset_filters(), Dataset.status == DatasetStatus.published)

    total_result = await db.execute(select(func.count()).select_from(ds_q.subquery()))
    total_datasets = total_result.scalar_one()

    cat_result = await db.execute(
        select(func.count(func.distinct(Dataset.category))).select_from(ds_q.subquery())
    )
    total_categories = cat_result.scalar_one()

    dl_result = await db.execute(
        select(func.coalesce(func.sum(Dataset.download_count), 0)).select_from(ds_q.subquery())
    )
    total_downloads = dl_result.scalar_one()

    from fasodata.prices.models import PriceData as PriceModel
    from fasodata.core.data_origin import visible_origin_filter as _vof
    price_filter = _vof(PriceModel.data_origin, settings)
    price_q = select(func.count()).select_from(PriceModel)
    if price_filter is not None:
        price_q = price_q.where(price_filter)
    price_result = await db.execute(price_q)
    total_prices = price_result.scalar_one()

    org_result = await db.execute(
        select(func.count(func.distinct(User.organization))).where(
            User.organization.is_not(None), User.organization != ""
        )
    )
    total_organizations = org_result.scalar_one()

    return {
        "datasets": total_datasets,
        "categories": total_categories,
        "downloads": int(total_downloads),
        "price_observations": total_prices,
        "organizations": total_organizations,
    }


@router.get("", response_model=DatasetListOut)
async def list_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    category: str | None = None,
    status: DatasetStatus | None = DatasetStatus.published,
    sort: str = Query("recent", regex="^(recent|popular|downloads|name)$"),
    db: AsyncSession = Depends(get_db),
):
    await ensure_public_price_dataset(db)
    query = select(Dataset).where(*_visible_dataset_filters())
    if status:
        query = query.where(Dataset.status == status)
    if category:
        query = query.where(Dataset.category == category)
    if q:
        query = query.where(Dataset.name.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    _sort = {
        "recent":    Dataset.created_at.desc(),
        "popular":   Dataset.view_count.desc(),
        "downloads": Dataset.download_count.desc(),
        "name":      Dataset.name.asc(),
    }
    query = query.order_by(_sort.get(sort, Dataset.created_at.desc()))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return DatasetListOut(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=DatasetOut, status_code=201)
async def create_dataset(
    data: DatasetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    slug = make_unique_slug(data.name)
    existing = await db.execute(select(Dataset).where(Dataset.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    payload = data.model_dump()
    payload["data_origin"] = payload.get("data_origin") or "user_upload"
    dataset = Dataset(
        **payload,
        slug=slug,
        owner_id=current_user.id,
    )
    db.add(dataset)
    await db.flush()
    return dataset


@router.get("/my", response_model=DatasetListOut)
async def my_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    status: DatasetStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retourne les datasets de l'utilisateur connecté (tous statuts)."""
    query = select(Dataset).where(Dataset.owner_id == current_user.id)
    if status:
        query = query.where(Dataset.status == status)
    if q:
        query = query.where(Dataset.name.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.order_by(Dataset.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return DatasetListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/admin-list", response_model=DatasetListOut)
async def admin_list_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    status: DatasetStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Liste tous les datasets (tous statuts) — réservé admin."""
    query = select(Dataset)
    if status:
        query = query.where(Dataset.status == status)
    if q:
        query = query.where(Dataset.name.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.order_by(Dataset.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return DatasetListOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/{slug}", response_model=DatasetOut)
async def get_dataset(slug: str, db: AsyncSession = Depends(get_db)):
    if slug == PRICE_DATASET_SLUG:
        await ensure_public_price_dataset(db)

    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    # Incrémenter les vues
    dataset.view_count += 1
    return dataset


@router.patch("/{slug}", response_model=DatasetOut)
async def update_dataset(
    slug: str,
    data: DatasetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(dataset, field, value)

    if data.status == DatasetStatus.published and not dataset.published_at:
        dataset.published_at = datetime.now(timezone.utc)

    return dataset


@router.post("/{slug}/submit", response_model=DatasetOut)
async def submit_dataset_for_review(
    slug: str,
    data: DatasetModerationRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")
    if current_user.role.value != "admin" and dataset.owner_id != current_user.id:
        raise HTTPException(403, detail="Vous ne pouvez soumettre que vos propres datasets")
    if dataset.status != DatasetStatus.draft:
        raise HTTPException(409, detail="Seuls les brouillons peuvent etre soumis a validation")

    dataset.status = DatasetStatus.pending
    dataset.published_at = None
    dataset.updated_at = datetime.now(timezone.utc)
    return dataset


@router.post("/{slug}/approve", response_model=DatasetOut)
async def approve_dataset(
    slug: str,
    data: DatasetModerationRequest | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")
    _ensure_dataset_can_be_reviewed(dataset)

    now = datetime.now(timezone.utc)
    dataset.status = DatasetStatus.published
    dataset.published_at = dataset.published_at or now
    dataset.updated_at = now
    return dataset


@router.post("/{slug}/reject", response_model=DatasetOut)
async def reject_dataset(
    slug: str,
    data: DatasetModerationRequest | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")
    _ensure_dataset_can_be_reviewed(dataset)

    dataset.status = DatasetStatus.draft
    dataset.published_at = None
    dataset.updated_at = datetime.now(timezone.utc)
    return dataset


@router.get("/{slug}/preview", response_model=DatasetPreview)
async def preview_dataset(
    slug: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    if slug == PRICE_DATASET_SLUG:
        from fasodata.prices.models import PriceData

        dataset = await ensure_public_price_dataset(db)
        result = await db.execute(
            select(PriceData)
            .where(*_visible_price_filters(PriceData))
            .order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
            .limit(limit)
        )
        rows = [_price_row_to_dict(row) for row in result.scalars().all()]
        return DatasetPreview(
            columns=[col["name"] for col in PRICE_DATASET_COLUMNS],
            rows=rows,
            total_rows=dataset.row_count,
        )

    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    # Si le fichier est dans MinIO, on le lit directement
    if dataset.s3_key:
        try:
            from minio import Minio
            import pandas as pd

            client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
            )
            response = client.get_object(settings.minio_bucket, dataset.s3_key)
            raw = response.read()
            response.close()

            if dataset.file_format == "xlsx":
                df = pd.read_excel(io.BytesIO(raw), nrows=limit)
            else:
                df = pd.read_csv(io.BytesIO(raw), nrows=limit)

            # Remplacer NaN par None pour JSON
            df = df.where(df.notna(), None)
            return DatasetPreview(
                columns=list(df.columns),
                rows=df.head(limit).to_dict("records"),
                total_rows=dataset.row_count,
            )
        except Exception:
            pass  # Retomber sur la prévisualisation depuis columns_meta

    # Prévisualisation synthétique depuis les métadonnées colonnes
    if dataset.columns_meta:
        columns = [col["name"] for col in dataset.columns_meta]
        return DatasetPreview(columns=columns, rows=[], total_rows=dataset.row_count)

    raise HTTPException(
        422,
        detail="Aucune donnée disponible pour la prévisualisation. Importez un fichier d'abord.",
    )


@router.get("/{slug}/stats", response_model=DatasetStats)
async def stats_dataset(slug: str, db: AsyncSession = Depends(get_db)):
    if slug == PRICE_DATASET_SLUG:
        dataset = await ensure_public_price_dataset(db)
        return DatasetStats(
            row_count=dataset.row_count,
            column_count=len(PRICE_DATASET_COLUMNS),
            columns=PRICE_DATASET_COLUMNS,
        )

    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    columns = dataset.columns_meta or []
    return DatasetStats(
        row_count=dataset.row_count,
        column_count=len(columns),
        columns=columns,
    )


@router.get("/{slug}/download")
async def download_dataset(slug: str, db: AsyncSession = Depends(get_db)):
    if slug == PRICE_DATASET_SLUG:
        from fasodata.prices.models import PriceData

        dataset = await ensure_public_price_dataset(db)
        dataset.download_count += 1

        result = await db.execute(
            select(PriceData)
            .where(*_visible_price_filters(PriceData))
            .order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
        )
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=[col["name"] for col in PRICE_DATASET_COLUMNS])
        writer.writeheader()
        for row in result.scalars().all():
            writer.writerow(_price_row_to_dict(row))
        buffer.seek(0)

        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={PRICE_DATASET_SLUG}.csv"},
        )

    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug, *_visible_dataset_filters())
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    dataset.download_count += 1

    if dataset.s3_key:
        try:
            from minio import Minio
            from datetime import timedelta

            client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
            )
            filename = dataset.s3_key.split("/")[-1]
            if settings.minio_public_url:
                # Générer URL signée et remplacer l'host interne
                url = client.presigned_get_object(
                    settings.minio_bucket,
                    dataset.s3_key,
                    expires=timedelta(minutes=30),
                )
                internal = f"{'https' if settings.minio_secure else 'http'}://{settings.minio_endpoint}"
                url = url.replace(internal, settings.minio_public_url.rstrip("/"))
                return {"download_url": url, "filename": filename}
            else:
                # Pas d'URL publique MinIO : streamer le fichier directement via l'API
                from fastapi.responses import StreamingResponse as SR
                obj = client.get_object(settings.minio_bucket, dataset.s3_key)
                content_type = "text/csv; charset=utf-8" if filename.endswith(".csv") else "application/octet-stream"
                return SR(
                    obj,
                    media_type=content_type,
                    headers={"Content-Disposition": f"attachment; filename={filename}"},
                )
        except Exception:
            pass

    # Pas de fichier réel — retourner une réponse CSV synthétique
    raise HTTPException(
        404,
        detail="Fichier non disponible. Importez d'abord un fichier CSV ou XLSX.",
    )


@router.delete("/{slug}", status_code=204)
async def delete_dataset(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")
    await db.delete(dataset)


@router.post("/{slug}/upload", response_model=ImportJobOut)
async def upload_file(
    slug: str,
    file: UploadFile = File(...),
    delimiter: str = Form(","),
    has_header: bool = Form(True),
    lat_field: str | None = Form(None),
    lon_field: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    content = await file.read()
    s3_key = f"datasets/{slug}/{file.filename}"

    job = ImportJob(dataset_id=dataset.id, status="queued")
    db.add(job)
    await db.flush()

    task = import_csv_task.delay(
        job_id=str(job.id),
        dataset_id=str(dataset.id),
        s3_key=s3_key,
        file_content=content.decode("utf-8", errors="replace"),
        delimiter=delimiter,
        has_header=has_header,
        lat_field=lat_field,
        lon_field=lon_field,
    )
    job.celery_task_id = task.id
    return job


@router.get("/{slug}/jobs", response_model=list[ImportJobOut])
async def list_import_jobs(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    result = await db.execute(
        select(Dataset).where(Dataset.slug == slug)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    jobs_result = await db.execute(
        select(ImportJob)
        .where(ImportJob.dataset_id == dataset.id)
        .order_by(ImportJob.created_at.desc())
    )
    return jobs_result.scalars().all()


@router.get("/jobs/{job_id}", response_model=ImportJobOut)
async def get_job_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    result = await db.execute(select(ImportJob).where(ImportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, detail="Job introuvable")
    return job
