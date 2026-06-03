import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from fasodata.auth.deps import require_institutional
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
