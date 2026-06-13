import hashlib
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.analytics.models import PageView
from fasodata.analytics.schemas import (
    AnalyticsDailyPoint,
    AnalyticsKpis,
    AnalyticsPageStat,
    AnalyticsReferrerStat,
    AnalyticsStatsOut,
    PageViewCreate,
    PageViewCreated,
)
from fasodata.auth.deps import require_admin
from fasodata.core.database import get_db
from fasodata.users.models import User

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _hash_ip(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(f"fasodata:{value}".encode("utf-8")).hexdigest()


def _referrer_domain(referrer: str | None) -> str | None:
    if not referrer:
        return None
    parsed = urlparse(referrer)
    return parsed.netloc.lower() or None


def _visitor_expr():
    return func.coalesce(PageView.visitor_id, PageView.ip_hash)


@router.post("/page-view", response_model=PageViewCreated, status_code=201)
async def collect_page_view(
    payload: PageViewCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    path = payload.path.strip()
    if not path.startswith("/") or path.startswith("/api/"):
        return PageViewCreated(ok=True)

    db.add(
        PageView(
            path=path[:500],
            title=(payload.title or None),
            referrer=(payload.referrer or None),
            referrer_domain=_referrer_domain(payload.referrer),
            visitor_id=payload.visitor_id or None,
            session_id=payload.session_id or None,
            ip_hash=_hash_ip(request.client.host if request.client else None),
            user_agent=(request.headers.get("user-agent") or "")[:500],
        )
    )
    await db.flush()
    return PageViewCreated(ok=True)


@router.get("/stats", response_model=AnalyticsStatsOut)
async def analytics_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    visitor = _visitor_expr()

    kpi_row = (
        await db.execute(
            select(
                func.count(PageView.id),
                func.count(distinct(visitor)),
                func.count(case((PageView.created_at >= today, PageView.id))),
                func.count(case((PageView.path.startswith("/admin"), PageView.id))),
                func.count(case((PageView.path.startswith("/dashboard"), PageView.id))),
            ).where(PageView.created_at >= since)
        )
    ).one()
    total_views = int(kpi_row[0] or 0)
    unique_visitors = int(kpi_row[1] or 0)
    today_views = int(kpi_row[2] or 0)
    admin_views = int(kpi_row[3] or 0)
    private_views = int(kpi_row[4] or 0)
    public_views = max(total_views - admin_views - private_views, 0)

    daily_rows = (
        await db.execute(
            select(
                func.date_trunc("day", PageView.created_at).label("day"),
                func.count(PageView.id).label("views"),
                func.count(distinct(visitor)).label("visitors"),
            )
            .where(PageView.created_at >= since)
            .group_by("day")
            .order_by("day")
        )
    ).all()

    top_page_rows = (
        await db.execute(
            select(
                PageView.path,
                func.count(PageView.id).label("views"),
                func.count(distinct(visitor)).label("visitors"),
            )
            .where(PageView.created_at >= since)
            .group_by(PageView.path)
            .order_by(func.count(PageView.id).desc())
            .limit(10)
        )
    ).all()

    referrer_rows = (
        await db.execute(
            select(
                func.coalesce(PageView.referrer_domain, "direct").label("source"),
                func.count(PageView.id).label("views"),
            )
            .where(PageView.created_at >= since)
            .group_by("source")
            .order_by(func.count(PageView.id).desc())
            .limit(10)
        )
    ).all()

    return AnalyticsStatsOut(
        period_days=days,
        kpis=AnalyticsKpis(
            total_views=total_views,
            unique_visitors=unique_visitors,
            today_views=today_views,
            public_views=public_views,
            private_views=private_views,
            admin_views=admin_views,
        ),
        daily=[
            AnalyticsDailyPoint(date=row.day.date(), views=int(row.views), visitors=int(row.visitors))
            for row in daily_rows
        ],
        top_pages=[
            AnalyticsPageStat(path=row.path, views=int(row.views), visitors=int(row.visitors))
            for row in top_page_rows
        ],
        referrers=[
            AnalyticsReferrerStat(source=row.source, views=int(row.views))
            for row in referrer_rows
        ],
    )
