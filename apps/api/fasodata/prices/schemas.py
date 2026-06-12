import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class PriceDataCreate(BaseModel):
    commodity:  str
    region:     str = "National"
    market:     str | None = None
    price:      float = Field(gt=0)
    unit:       str = "CFA/kg"
    quality:    str | None = None
    price_date: date
    source:     str = "manual"
    data_origin: str = "manual"
    reporter:   str | None = None
    notes:      str | None = None


class PriceDataOut(PriceDataCreate):
    id:                uuid.UUID
    n_obs:             int
    created_at:        datetime
    validation_status: str = "auto"
    validated_by:      str | None = None
    validated_at:      datetime | None = None
    anomaly_score:     int | None = None
    model_config = {"from_attributes": True}


# ── Agrégat pour les séries temporelles ──────────────────────────────────────

class SeriesPoint(BaseModel):
    """Un point de la série temporelle (mensuel ou annuel)."""
    period: str        # "2024-01" (mensuel) ou "2024" (annuel)
    price:  float      # prix moyen pondéré
    min:    float
    max:    float
    n_obs:  int        # nombre total d'observations
    sources: dict[str, int] = Field(default_factory=dict)


class PriceSeries(BaseModel):
    commodity:   str
    region:      str
    granularity: Literal["monthly", "yearly"]
    unit:        str = "CFA/kg"
    source:      str
    sources:     list[str] = Field(default_factory=list)
    points:      list[SeriesPoint]


# ── Ingestion SMS / WhatsApp ──────────────────────────────────────────────────

class SmsIngestPayload(BaseModel):
    """Payload reçu d'un agregateur SMS (Africa's Talking, Twilio, etc.)."""
    from_number: str       # numéro expéditeur
    message:     str       # texte brut ex: "SORGHO SAHEL 285"
    received_at: datetime | None = None


class WhatsAppIngestPayload(BaseModel):
    """Payload WhatsApp Business API."""
    wa_id:      str        # identifiant WhatsApp
    message:    str
    received_at: datetime | None = None
