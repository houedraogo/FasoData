"""
Modèle PriceData — suivi des prix alimentaires au Burkina Faso.

Sources supportées :
  - world_bank   : données historiques Banque Mondiale / WFP
  - wfp          : WFP VAM food price monitoring
  - sms          : collecte par SMS (Africa's Talking / Twilio)
  - whatsapp     : collecte WhatsApp Business API
  - manual       : saisie manuelle par un opérateur
"""

import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from fasodata.core.database import Base


class CommodityType(str, enum.Enum):
    sorghum    = "sorghum"      # Sorgho
    rice_local = "rice_local"   # Riz local (paddy / décortiqué)
    maize      = "maize"        # Maïs
    millet     = "millet"       # Mil
    cowpea     = "cowpea"       # Niébé
    groundnut  = "groundnut"    # Arachide


class PriceSource(str, enum.Enum):
    world_bank = "world_bank"
    wfp        = "wfp"
    sms        = "sms"
    whatsapp   = "whatsapp"
    manual     = "manual"


class PriceData(Base):
    __tablename__ = "price_data"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # ── Quoi / Où ─────────────────────────────────────────────────────────────
    # ISO 3166-1 alpha-3 : BFA (Burkina Faso), MLI (Mali), NER (Niger)
    country:   Mapped[str] = mapped_column(String(3),  nullable=False, default="BFA", server_default="BFA", index=True)
    commodity: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # Exemples : "Sahel", "Centre", "National", "Ouagadougou"
    region:    Mapped[str] = mapped_column(String(100), nullable=False, default="National", index=True)
    market:    Mapped[str | None] = mapped_column(String(200))  # ex: "Marché Rood Woko"

    # ── Prix ──────────────────────────────────────────────────────────────────
    price:     Mapped[float]      = mapped_column(Float, nullable=False)
    unit:      Mapped[str]        = mapped_column(String(20), default="CFA/kg")
    # Qualité / variété : "local", "importé", "blanchi", "paddy"…
    quality:   Mapped[str | None] = mapped_column(String(50))

    # ── Temporel ──────────────────────────────────────────────────────────────
    price_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # ── Méta ──────────────────────────────────────────────────────────────────
    source:     Mapped[str]       = mapped_column(String(50), default=PriceSource.manual)
    data_origin: Mapped[str]      = mapped_column(String(30), default="manual", server_default="manual", nullable=False, index=True)
    reporter:   Mapped[str | None] = mapped_column(String(100))
    n_obs:      Mapped[int]        = mapped_column(Integer, default=1)
    notes:      Mapped[str | None] = mapped_column(String(500))

    # ── Validation ────────────────────────────────────────────────────────────
    # "auto"       : données WFP/seed (validées automatiquement)
    # "pending"    : SMS reçu, en attente de revue admin
    # "validated"  : approuvé par admin ou auto (prix dans la plage normale)
    # "rejected"   : rejeté par admin (anomalie confirmée, ne sera pas agrégé)
    # "aggregated" : inclus dans l'agrégation nocturne du jour
    validation_status: Mapped[str] = mapped_column(
        String(20), default="auto", server_default="auto", nullable=False
    )
    validated_by:  Mapped[str | None] = mapped_column(String(100))  # email admin
    validated_at:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Déviation par rapport à la moyenne historique (en %)
    anomaly_score: Mapped[float | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
