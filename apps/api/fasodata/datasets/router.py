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
from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset, DatasetLicense, DatasetStatus, ImportJob
from fasodata.datasets.schemas import (
    DatasetCreate,
    DatasetListOut,
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
    {"name": "reporter", "type": "string", "description": "Collecteur ou systeme source"},
    {"name": "validation_status", "type": "string", "description": "Statut de validation FasoData"},
    {"name": "notes", "type": "string", "description": "Notes techniques"},
]


def make_unique_slug(base: str) -> str:
    return slugify(base)


async def ensure_public_price_dataset(db: AsyncSession) -> Dataset:
    from fasodata.prices.models import PriceData

    now = datetime.now(timezone.utc)
    row_count = await db.scalar(select(func.count()).select_from(PriceData))
    result = await db.execute(select(Dataset).where(Dataset.slug == PRICE_DATASET_SLUG))
    dataset = result.scalar_one_or_none()

    if not dataset:
        dataset = Dataset(
            slug=PRICE_DATASET_SLUG,
            name="Prix alimentaires - Burkina Faso",
            published_at=now,
        )
        db.add(dataset)

    dataset.description = (
        "Donnees publiques de suivi des prix alimentaires au Burkina Faso, "
        "issues de WFP DataBridges et des collectes terrain validees par FasoData."
    )
    dataset.category = "Agriculture"
    dataset.tags = ["prix", "cereales", "WFP", "Burkina Faso", "marches"]
    dataset.source = "WFP DataBridges; FasoData SMS"
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
        "reporter": row.reporter,
        "validation_status": row.validation_status,
        "notes": row.notes,
    }


@router.get("", response_model=DatasetListOut)
async def list_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    category: str | None = None,
    status: DatasetStatus | None = DatasetStatus.published,
    db: AsyncSession = Depends(get_db),
):
    await ensure_public_price_dataset(db)
    query = select(Dataset)
    if status:
        query = query.where(Dataset.status == status)
    if category:
        query = query.where(Dataset.category == category)
    if q:
        query = query.where(Dataset.name.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.order_by(Dataset.created_at.desc())
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

    dataset = Dataset(
        **data.model_dump(),
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

    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
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
    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, detail="Dataset introuvable")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(dataset, field, value)

    if data.status == DatasetStatus.published and not dataset.published_at:
        dataset.published_at = datetime.now(timezone.utc)

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
            .order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
            .limit(limit)
        )
        rows = [_price_row_to_dict(row) for row in result.scalars().all()]
        return DatasetPreview(
            columns=[col["name"] for col in PRICE_DATASET_COLUMNS],
            rows=rows,
            total_rows=dataset.row_count,
        )

    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
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

    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
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
            select(PriceData).order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
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

    result = await db.execute(select(Dataset).where(Dataset.slug == slug))
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
            url = client.presigned_get_object(
                settings.minio_bucket,
                dataset.s3_key,
                expires=timedelta(minutes=30),
            )
            return {"download_url": url, "filename": dataset.s3_key.split("/")[-1]}
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
