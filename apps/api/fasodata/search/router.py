from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import meilisearch

from fasodata.core.config import get_settings
from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset, DatasetStatus
from fasodata.datasets.router import _visible_dataset_filters

router = APIRouter(prefix="/api/search", tags=["search"])
settings = get_settings()


def get_meili():
    return meilisearch.Client(settings.meilisearch_url, settings.meilisearch_api_key)


def _ds_index(dataset_id: str) -> str:
    return f"dataset_{str(dataset_id).replace('-', '_')}"


@router.get("/facets")
async def search_facets(db: AsyncSession = Depends(get_db)):
    """Valeurs disponibles pour les filtres de la page /recherche."""
    base = select(Dataset).where(*_visible_dataset_filters(), Dataset.status == DatasetStatus.published)

    cats = await db.execute(
        select(Dataset.category, func.count(Dataset.id).label("n"))
        .where(*_visible_dataset_filters(), Dataset.status == DatasetStatus.published, Dataset.category.isnot(None))
        .group_by(Dataset.category)
        .order_by(func.count(Dataset.id).desc())
    )
    origins = await db.execute(
        select(Dataset.data_origin, func.count(Dataset.id).label("n"))
        .where(*_visible_dataset_filters(), Dataset.status == DatasetStatus.published, Dataset.data_origin.isnot(None))
        .group_by(Dataset.data_origin)
        .order_by(func.count(Dataset.id).desc())
    )
    formats = await db.execute(
        select(Dataset.file_format, func.count(Dataset.id).label("n"))
        .where(*_visible_dataset_filters(), Dataset.status == DatasetStatus.published, Dataset.file_format.isnot(None))
        .group_by(Dataset.file_format)
        .order_by(func.count(Dataset.id).desc())
    )

    return {
        "categories": [{"value": r.category, "count": r.n} for r in cats.all()],
        "origins":    [{"value": r.data_origin, "count": r.n} for r in origins.all()],
        "formats":    [{"value": r.file_format,  "count": r.n} for r in formats.all()],
    }


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    dataset_id: str | None = None,
    category: str | None = None,
    origin: str | None = None,
    file_format: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    client = get_meili()
    offset = (page - 1) * page_size

    # ── Recherche sur un dataset précis ──────────────────────────────────────
    if dataset_id:
        index_name = _ds_index(dataset_id)
        try:
            result = client.index(index_name).search(
                q, {"limit": page_size, "offset": offset}
            )
            return {
                "hits": result["hits"],
                "total": result.get("estimatedTotalHits", 0),
                "page": page,
                "page_size": page_size,
                "dataset_id": dataset_id,
            }
        except Exception:
            return {"hits": [], "total": 0, "page": page, "page_size": page_size}

    # ── Filtrer les datasets éligibles via PostgreSQL ─────────────────────────
    ds_query = select(Dataset.id, Dataset.name, Dataset.category, Dataset.data_origin).where(
        *_visible_dataset_filters(), Dataset.status == DatasetStatus.published
    )
    if category:
        ds_query = ds_query.where(Dataset.category.ilike(category))
    if origin:
        ds_query = ds_query.where(Dataset.data_origin == origin)
    if file_format:
        ds_query = ds_query.where(Dataset.file_format == file_format)

    ds_rows = (await db.execute(ds_query)).all()
    eligible_ids = {str(r.id) for r in ds_rows}
    ds_meta = {str(r.id): {"name": r.name, "category": r.category, "origin": r.data_origin} for r in ds_rows}

    # ── Recherche multi-index Meilisearch ────────────────────────────────────
    meili_indexes = client.get_indexes()
    all_hits = []
    for idx in meili_indexes.get("results", []):
        if not idx.uid.startswith("dataset_"):
            continue
        # Reconstituer l'UUID depuis le nom d'index dataset_xxxx_xxxx_... → "xxxx-xxxx-..."
        raw = idx.uid[len("dataset_"):]
        # Try to match against eligible dataset IDs
        matched_id = None
        for eid in eligible_ids:
            if raw == eid.replace("-", "_"):
                matched_id = eid
                break
        if matched_id is None:
            continue
        try:
            res = client.index(idx.uid).search(q, {"limit": 5})
            for hit in res["hits"]:
                hit["_index"] = idx.uid
                hit["_dataset_id"] = matched_id
                hit["_dataset_name"] = ds_meta[matched_id]["name"]
                hit["_category"] = ds_meta[matched_id]["category"]
            all_hits.extend(res["hits"])
        except Exception:
            continue

    return {
        "hits": all_hits[offset: offset + page_size],
        "total": len(all_hits),
        "page": page,
        "page_size": page_size,
    }
