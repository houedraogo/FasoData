import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from fasodata.dashboard.models import (
    AlertRuleStatus,
    AlertSeverity,
    MetricStatus,
    QualityCheckStatus,
    QualityIssueSeverity,
    TeamMemberStatus,
)


class AlertRuleBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    metric_key: str
    comparator: str
    threshold_value: float
    unit: str | None = None
    region: str | None = None
    channels: list[str] = []
    severity: AlertSeverity = AlertSeverity.warning
    status: AlertRuleStatus = AlertRuleStatus.active


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    metric_key: str | None = None
    comparator: str | None = None
    threshold_value: float | None = None
    unit: str | None = None
    region: str | None = None
    channels: list[str] | None = None
    severity: AlertSeverity | None = None
    status: AlertRuleStatus | None = None


class AlertRuleOut(AlertRuleBase):
    id: uuid.UUID
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SystemMetricCreate(BaseModel):
    service: str
    metric_key: str
    label: str
    value: float
    unit: str | None = None
    status: MetricStatus = MetricStatus.ok
    metadata_json: dict | None = None


class SystemMetricOut(SystemMetricCreate):
    id: uuid.UUID
    recorded_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberCreate(BaseModel):
    organization: str
    email: str
    full_name: str | None = None
    role: str
    access_level: str
    status: TeamMemberStatus = TeamMemberStatus.invited
    is_owner: bool = False


class TeamMemberUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    access_level: str | None = None
    status: TeamMemberStatus | None = None
    is_owner: bool | None = None


class TeamMemberOut(TeamMemberCreate):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    invited_by_id: uuid.UUID | None = None
    invited_at: datetime
    joined_at: datetime | None = None

    model_config = {"from_attributes": True}


class QualityIssueCreate(BaseModel):
    line_number: int | None = None
    column_name: str | None = None
    raw_value: str | None = None
    problem: str
    suggestion: str | None = None
    severity: QualityIssueSeverity = QualityIssueSeverity.medium


class QualityIssueOut(QualityIssueCreate):
    id: uuid.UUID
    check_id: uuid.UUID
    is_resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class QualityIssueCorrection(BaseModel):
    corrected_value: str | None = None
    note: str | None = None


class QualityCheckCreate(BaseModel):
    dataset_id: uuid.UUID | None = None
    dataset_slug: str | None = None
    status: QualityCheckStatus = QualityCheckStatus.completed
    score: int = 0
    completeness: int = 0
    coherence: int = 0
    duplicate_count: int = 0
    flagged_rows: int = 0
    total_rows: int = 0
    issues: list[QualityIssueCreate] = []


class QualityCheckUpdate(BaseModel):
    status: QualityCheckStatus | None = None
    score: int | None = None
    completeness: int | None = None
    coherence: int | None = None
    duplicate_count: int | None = None
    flagged_rows: int | None = None
    total_rows: int | None = None


class QualityCheckOut(BaseModel):
    id: uuid.UUID
    dataset_id: uuid.UUID | None = None
    dataset_slug: str | None = None
    status: QualityCheckStatus
    score: int
    completeness: int
    coherence: int
    duplicate_count: int
    flagged_rows: int
    total_rows: int
    reviewer_id: uuid.UUID | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    issues: list[QualityIssueOut] = []

    model_config = {"from_attributes": True}
