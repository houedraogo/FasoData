import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class SubscribeRequest(BaseModel):
    email:           EmailStr
    whatsapp_number: str | None = Field(default=None, max_length=30, description="Numero WhatsApp au format international")
    commodity:       str
    region:          str = "National"
    threshold_price: float = Field(gt=0, description="Seuil en CFA/kg")


class SubscribeOut(BaseModel):
    id:              uuid.UUID
    email:           str
    whatsapp_number: str | None = None
    commodity:       str
    region:          str
    threshold_price: float
    is_confirmed:    bool
    is_active:       bool
    alert_count:     int
    last_alerted_at: datetime | None = None
    last_price_alerted: float | None = None
    confirmed_at:    datetime | None = None
    created_at:      datetime
    model_config = {"from_attributes": True}


class SubscriptionUpdate(BaseModel):
    email:           EmailStr | None = None
    whatsapp_number: str | None = Field(default=None, max_length=30)
    commodity:       str | None = None
    region:          str | None = None
    threshold_price: float | None = Field(default=None, gt=0)
    is_confirmed:    bool | None = None
    is_active:       bool | None = None


class AlertStatus(BaseModel):
    total_subscriptions: int
    active_confirmed:    int
    pending_confirmation:int
    alerts_sent_today:   int
    smtp_configured:     bool
