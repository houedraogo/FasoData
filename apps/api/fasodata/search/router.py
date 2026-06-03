from fastapi import APIRouter, Depends, Query

import meilisearch

from fasodata.core.config import get_settings

router = APIRouter(prefix="/api/search", tags=["search"])
settings = get_settings()


def get_meili():
    return meilisearch.Client(settings.meilisearch_url, settings.meilisearch_api_key)


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    dataset_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    client = get_meili()
    offset = (page - 1) * page_size

    if dataset_id:
        index_name = f"dataset_{dataset_id.replace('-', '_')}"
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

    # Recherche multi-index
    indexes = client.get_indexes()
    all_hits = []
    for idx in indexes.get("results", []):
        if idx.uid.startswith("dataset_"):
            try:
                res = client.index(idx.uid).search(q, {"limit": 5})
                for hit in res["hits"]:
                    hit["_index"] = idx.uid
                all_hits.extend(res["hits"])
            except Exception:
                continue

    return {
        "hits": all_hits[offset : offset + page_size],
        "total": len(all_hits),
        "page": page,
        "page_size": page_size,
    }
