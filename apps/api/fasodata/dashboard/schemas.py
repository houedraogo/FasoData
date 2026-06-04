import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field

from fasodata.dashboard.models import (
    AlertRuleStatus,
    AlertSeverity,
    MetricStatus,
    QualityCheckStatus,
    QualityIssueSeverity,
    ProgramStatus,
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


class DashboardKpiOut(BaseModel):
    key: str
    label: str
    value: int | float | str
    unit: str | None = None
    sub: str | None = None
    change: float = 0
    spark: list[int | float] = []


class DashboardOverviewOut(BaseModel):
    updated_at: datetime
    period: str
    kpis: list[DashboardKpiOut]


class DashboardPreferenceBase(BaseModel):
    domains: list[str] = Field(default_factory=list)
    data_types: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)


class DashboardPreferenceUpdate(DashboardPreferenceBase):
    pass


class DashboardPreferenceOut(DashboardPreferenceBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_configured: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardRecommendationOut(BaseModel):
    key: str
    title: str
    text: str
    href: str
    kind: str
    source: str
    metric: str | None = None
    detail: str | None = None
    icon: str = "database"


class DashboardRegionSummaryOut(BaseModel):
    region: str
    observations: int
    avg_price: float
    latest_date: date | None = None


class ProgramCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    sector: str = "food_prices"
    period: str = "12m"
    status: ProgramStatus = ProgramStatus.active
    metadata_json: dict | None = None


class ProgramUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    sector: str | None = None
    period: str | None = None
    status: ProgramStatus | None = None
    metadata_json: dict | None = None


class ProgramOut(ProgramCreate):
    id: uuid.UUID
    owner_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProgramPriceAlertCreate(BaseModel):
    commodity: str
    region: str = "National"
    threshold_price: float = Field(gt=0)
    current_price: float | None = None
    channels: list[str] = ["dashboard"]


class ProgramPriceAlertUpdate(BaseModel):
    commodity: str | None = None
    region: str | None = None
    threshold_price: float | None = Field(default=None, gt=0)
    current_price: float | None = None
    is_triggered: bool | None = None
    channels: list[str] | None = None


class ProgramPriceAlertOut(ProgramPriceAlertCreate):
    id: uuid.UUID
    program_id: uuid.UUID
    is_triggered: bool
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProgramScenarioCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    region_a: str
    region_b: str
    commodity: str = "maize"
    parameters: dict | None = None


class ProgramScenarioUpdate(BaseModel):
    name: str | None = None
    region_a: str | None = None
    region_b: str | None = None
    commodity: str | None = None
    parameters: dict | None = None


class ProgramScenarioOut(ProgramScenarioCreate):
    id: uuid.UUID
    program_id: uuid.UUID
    created_by_id: uuid.UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProgramDetailOut(ProgramOut):
    alerts: list[ProgramPriceAlertOut] = []
    scenarios: list[ProgramScenarioOut] = []
