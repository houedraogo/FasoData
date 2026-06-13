import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from fasodata.core.database import Base


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertRuleStatus(str, enum.Enum):
    active = "active"
    paused = "paused"


class MetricStatus(str, enum.Enum):
    ok = "ok"
    warn = "warn"
    down = "down"


class TeamMemberStatus(str, enum.Enum):
    active = "active"
    invited = "invited"
    suspended = "suspended"


class QualityCheckStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class QualityIssueSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ProgramStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    archived = "archived"


class DashboardPreference(Base):
    __tablename__ = "dashboard_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_dashboard_preferences_user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    domains: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    data_types: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    regions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    is_configured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    guide_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_key: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    comparator: Mapped[str] = mapped_column(String(10), nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(40))
    region: Mapped[str | None] = mapped_column(String(120), index=True)
    channels: Mapped[list] = mapped_column(JSONB, default=list)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), default=AlertSeverity.warning, nullable=False)
    status: Mapped[AlertRuleStatus] = mapped_column(Enum(AlertRuleStatus), default=AlertRuleStatus.active, nullable=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SystemMetric(Base):
    __tablename__ = "system_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    metric_key: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[MetricStatus] = mapped_column(Enum(MetricStatus), default=MetricStatus.ok, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(120), nullable=False)
    access_level: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[TeamMemberStatus] = mapped_column(Enum(TeamMemberStatus), default=TeamMemberStatus.invited, nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class QualityCheck(Base):
    __tablename__ = "quality_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    dataset_slug: Mapped[str | None] = mapped_column(String(255), index=True)
    status: Mapped[QualityCheckStatus] = mapped_column(Enum(QualityCheckStatus), default=QualityCheckStatus.pending, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completeness: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    coherence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flagged_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class QualityIssue(Base):
    __tablename__ = "quality_issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("quality_checks.id", ondelete="CASCADE"), index=True)
    line_number: Mapped[int | None] = mapped_column(Integer)
    column_name: Mapped[str | None] = mapped_column(String(120))
    raw_value: Mapped[str | None] = mapped_column(Text)
    problem: Mapped[str] = mapped_column(Text, nullable=False)
    suggestion: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[QualityIssueSeverity] = mapped_column(Enum(QualityIssueSeverity), default=QualityIssueSeverity.medium, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sector: Mapped[str] = mapped_column(String(120), default="food_prices", nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(40), default="12m", nullable=False)
    status: Mapped[ProgramStatus] = mapped_column(Enum(ProgramStatus), default=ProgramStatus.active, nullable=False)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    metadata_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProgramPriceAlert(Base):
    __tablename__ = "program_price_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("programs.id", ondelete="CASCADE"), index=True)
    commodity: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    region: Mapped[str] = mapped_column(String(120), nullable=False, default="National", index=True)
    threshold_price: Mapped[float] = mapped_column(Float, nullable=False)
    current_price: Mapped[float | None] = mapped_column(Float)
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    channels: Mapped[list] = mapped_column(JSONB, default=list)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProgramScenario(Base):
    __tablename__ = "program_scenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("programs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    region_a: Mapped[str] = mapped_column(String(120), nullable=False)
    region_b: Mapped[str] = mapped_column(String(120), nullable=False)
    commodity: Mapped[str] = mapped_column(String(80), default="maize", nullable=False)
    parameters: Mapped[dict | None] = mapped_column(JSONB)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
