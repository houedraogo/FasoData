import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from fasodata.core.database import Base


class PageView(Base):
    __tablename__ = "page_views"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    path: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255))
    referrer: Mapped[str | None] = mapped_column(String(1000))
    referrer_domain: Mapped[str | None] = mapped_column(String(255), index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(120), index=True)
    session_id: Mapped[str | None] = mapped_column(String(120), index=True)
    ip_hash: Mapped[str | None] = mapped_column(String(128), index=True)
    user_agent: Mapped[str | None] = mapped_column(String(500))
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
