import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from fasodata.auth.deps import require_institutional
from fasodata.core.database import get_db
from fasodata.datasets.models import Dataset
from fasodata.reports.pdf import build_dataset_report_lines, build_text_pdf
from fasodata.reports.tasks import export_csv_task
from fasodata.users.models import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ExportRequest(BaseModel):
    filters: dict | None = None


@router.post("/{dataset_id}/export/csv")
async def export_csv(
    dataset_id: uuid.UUID,
    body: ExportRequest = ExportRequest(),
    current_user: User = Depends(require_institutional),
):
    task = export_csv_task.delay(str(dataset_id), body.filters)
    return {"task_id": task.id, "status": "queued"}


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
