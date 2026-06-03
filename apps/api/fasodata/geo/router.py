from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.core.database import get_db

router = APIRouter(prefix="/api/geo", tags=["geo"])


@router.get("/{dataset_id}/bbox")
async def geo_bbox(
    dataset_id: str,
    minx: float = Query(...),
    miny: float = Query(...),
    maxx: float = Query(...),
    maxy: float = Query(...),
    limit: int = Query(1000, le=5000),
    db: AsyncSession = Depends(get_db),
):
    table_name = f"geodata_{dataset_id.replace('-', '_')}"
    try:
        result = await db.execute(
            text(f"""
                SELECT
                    id,
                    ST_AsGeoJSON(geometry)::jsonb AS geometry,
                    properties
                FROM {table_name}
                WHERE geometry && ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, 4326)
                LIMIT :limit
            """),
            {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy, "limit": limit},
        )
        rows = result.fetchall()
    except Exception:
        raise HTTPException(404, detail="Données géographiques introuvables")

    features = [
        {
            "type": "Feature",
            "geometry": row.geometry,
            "properties": row.properties or {},
            "id": str(row.id),
        }
        for row in rows
    ]
    return {"type": "FeatureCollection", "features": features}


@router.get("/{dataset_id}/centroid")
async def geo_centroid(dataset_id: str, db: AsyncSession = Depends(get_db)):
    table_name = f"geodata_{dataset_id.replace('-', '_')}"
    try:
        result = await db.execute(
            text(f"""
                SELECT
                    ST_AsGeoJSON(ST_Centroid(ST_Collect(geometry)))::jsonb AS centroid,
                    ST_XMin(ST_Extent(geometry)) AS minx,
                    ST_YMin(ST_Extent(geometry)) AS miny,
                    ST_XMax(ST_Extent(geometry)) AS maxx,
                    ST_YMax(ST_Extent(geometry)) AS maxy,
                    COUNT(*) AS total
                FROM {table_name}
            """)
        )
        row = result.fetchone()
    except Exception:
        raise HTTPException(404, detail="Données géographiques introuvables")

    if not row or not row.centroid:
        raise HTTPException(404, detail="Aucune donnée géo")

    return {
        "centroid": row.centroid,
        "bbox": [row.minx, row.miny, row.maxx, row.maxy],
        "total": row.total,
    }
