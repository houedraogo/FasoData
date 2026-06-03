import io
import uuid

from celery import shared_task

from fasodata.core.celery_app import celery_app
from fasodata.core.config import get_settings

settings = get_settings()


@celery_app.task(bind=True, name="fasodata.reports.tasks.export_csv_task")
def export_csv_task(self, dataset_id: str, filters: dict | None = None):
    from fasodata.ingest.tasks import get_sync_db
    from fasodata.datasets.models import Dataset

    db = get_sync_db()
    try:
        import pandas as pd
        from minio import Minio

        dataset = db.get(Dataset, uuid.UUID(dataset_id))
        if not dataset or not dataset.s3_key:
            return {"error": "Dataset introuvable"}

        minio_client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

        response = minio_client.get_object(settings.minio_bucket, dataset.s3_key)
        df = pd.read_csv(io.BytesIO(response.read()))

        if filters:
            for col, val in filters.items():
                if col in df.columns:
                    df = df[df[col].astype(str).str.contains(str(val), case=False)]

        export_key = f"exports/{dataset_id}/{uuid.uuid4().hex}.csv"
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        minio_client.put_object(
            settings.minio_bucket,
            export_key,
            io.BytesIO(csv_bytes),
            len(csv_bytes),
            content_type="text/csv",
        )

        url = minio_client.presigned_get_object(settings.minio_bucket, export_key, expires=3600)
        dataset.download_count += 1
        db.commit()

        return {"download_url": url, "rows": len(df)}
    finally:
        db.close()
