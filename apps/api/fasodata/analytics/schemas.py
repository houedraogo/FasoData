from datetime import date

from pydantic import BaseModel, Field


class PageViewCreate(BaseModel):
    path: str = Field(..., min_length=1, max_length=500)
    title: str | None = Field(default=None, max_length=255)
    referrer: str | None = Field(default=None, max_length=1000)
    visitor_id: str | None = Field(default=None, max_length=120)
    session_id: str | None = Field(default=None, max_length=120)


class PageViewCreated(BaseModel):
    ok: bool = True


class AnalyticsKpis(BaseModel):
    total_views: int
    unique_visitors: int
    today_views: int
    public_views: int
    private_views: int
    admin_views: int


class AnalyticsDailyPoint(BaseModel):
    date: date
    views: int
    visitors: int


class AnalyticsPageStat(BaseModel):
    path: str
    views: int
    visitors: int


class AnalyticsReferrerStat(BaseModel):
    source: str
    views: int


class AnalyticsStatsOut(BaseModel):
    period_days: int
    kpis: AnalyticsKpis
    daily: list[AnalyticsDailyPoint]
    top_pages: list[AnalyticsPageStat]
    referrers: list[AnalyticsReferrerStat]
