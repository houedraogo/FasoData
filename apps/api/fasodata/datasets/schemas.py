import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from fasodata.datasets.models import DatasetLicense, DatasetStatus


class DatasetBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    category: str | None = None
    tags: list[str] = []
    source: str | None = None
    license: DatasetLicense = DatasetLicense.open


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    source: str | None = None
    license: DatasetLicense | None = None
    status: DatasetStatus | None = None


class DatasetModerationRequest(BaseModel):
    note: str | None = None


class DatasetOut(DatasetBase):
    id: uuid.UUID
    slug: str
    status: DatasetStatus
    is_geo: bool
    file_format: str | None = None
    file_size_bytes: int | None = None
    row_count: int | None = None
    download_count: int
    view_count: int
    owner_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None

    model_config = {"from_attributes": True}


class DatasetListOut(BaseModel):
    items: list[DatasetOut]
    total: int
    page: int
    page_size: int


class ImportJobOut(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID
    status: str
    progress: int
    error_message: str | None = None
    rows_imported: int
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[dict]
    total_rows: int | None = None


class DatasetStats(BaseModel):
    row_count: int | None
    column_count: int | None
    columns: list[dict]
