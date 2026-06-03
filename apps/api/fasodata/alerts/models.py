"""
Modèle AlertSubscription — abonnements aux alertes prix.

Un abonné reçoit un email quand le prix d'un produit dans une région
dépasse le seuil qu'il a configuré.

Workflow :
  1. POST /api/alerts/subscribe  → crée l'abonnement + envoie email de confirmation
  2. GET  /api/alerts/confirm/{token}  → active l'abonnement (double opt-in)
  3. Celery Check 3×/j → compare prix actuel vs seuil → envoie alerte si dépassement
  4. GET  /api/alerts/unsubscribe/{token}  → désactive proprement
"""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from fasodata.core.database import Base


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Qui et quoi ───────────────────────────────────────────────────────────
    email:           Mapped[str]   = mapped_column(String(255), nullable=False, index=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(30), index=True)
    commodity:       Mapped[str]   = mapped_column(String(50),  nullable=False)
    region:          Mapped[str]   = mapped_column(String(100), nullable=False, default="National")
    threshold_price: Mapped[float] = mapped_column(Float, nullable=False)  # CFA/kg

    # ── Statut ────────────────────────────────────────────────────────────────
    is_active:    Mapped[bool] = mapped_column(Boolean, default=False)  # False jusqu'à confirmation
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)  # email confirmé

    # ── Jeton unique ──────────────────────────────────────────────────────────
    # Utilisé pour confirmation + désabonnement (URL-safe)
    token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False,
        default=lambda: secrets.token_urlsafe(32)
    )

    # ── Historique des alertes ────────────────────────────────────────────────
    last_alerted_at:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_price_alerted: Mapped[float | None]    = mapped_column(Float)
    alert_count:        Mapped[int]             = mapped_column(Integer, default=0)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
