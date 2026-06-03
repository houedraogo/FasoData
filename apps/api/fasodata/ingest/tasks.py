import io
import uuid
from datetime import datetime, timezone

import pandas as pd
from celery import shared_task
from sqlalchemy import update

from fasodata.core.celery_app import celery_app
from fasodata.core.config import get_settings

settings = get_settings()


def get_sync_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    sync_url = settings.database_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    return Session()


@celery_app.task(bind=True, name="fasodata.ingest.tasks.import_csv_task")
def import_csv_task(
    self,
    job_id: str,
    dataset_id: str,
    s3_key: str,
    file_content: str,
    delimiter: str = ",",
    has_header: bool = True,
    lat_field: str | None = None,
    lon_field: str | None = None,
):
    from fasodata.datasets.models import Dataset, ImportJob

    db = get_sync_db()
    try:
        job = db.get(ImportJob, uuid.UUID(job_id))
        if not job:
            return {"error": "Job introuvable"}

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        # Lire le CSV
        df = pd.read_csv(
            io.StringIO(file_content),
            sep=delimiter,
            header=0 if has_header else None,
        )

        row_count = len(df)
        columns_meta = [
            {
                "name": col,
                "type": str(df[col].dtype),
                "null_count": int(df[col].isna().sum()),
                "unique_count": int(df[col].nunique()),
            }
            for col in df.columns
        ]

        # Mettre à jour le dataset
        dataset = db.get(Dataset, uuid.UUID(dataset_id))
        if dataset:
            dataset.row_count = row_count
            dataset.columns_meta = columns_meta
            dataset.file_format = "csv"
            dataset.s3_key = s3_key
            if lat_field and lon_field and lat_field in df.columns and lon_field in df.columns:
                dataset.is_geo = True

        job.status = "done"
        job.progress = 100
        job.rows_imported = row_count
        job.finished_at = datetime.now(timezone.utc)
        db.commit()

        # Indexer dans Meilisearch (échantillon 1000 lignes)
        try:
            import meilisearch
            client = meilisearch.Client(settings.meilisearch_url, settings.meilisearch_api_key)
            index_name = f"dataset_{dataset_id.replace('-', '_')}"
            sample = df.head(1000).to_dict("records")
            for i, doc in enumerate(sample):
                doc["_id"] = i
                doc["_dataset_id"] = dataset_id
            client.index(index_name).add_documents(sample)
        except Exception:
            pass  # L'indexation Meili est non-bloquante

        return {"status": "done", "rows": row_count}

    except Exception as e:
        if db:
            job = db.get(ImportJob, uuid.UUID(job_id)) if job_id else None
            if job:
                job.status = "failed"
                job.error_message = str(e)
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
        raise
    finally:
        db.close()
