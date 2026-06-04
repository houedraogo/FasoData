from datetime import date, datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.auth.deps import get_current_active_user, require_admin, require_institutional
from fasodata.core.database import get_db
from fasodata.dashboard.models import (
    AlertRule,
    DashboardPreference,
    Program,
    ProgramPriceAlert,
    ProgramScenario,
    ProgramStatus,
    QualityCheck,
    QualityCheckStatus,
    QualityIssue,
    SystemMetric,
    TeamMember,
)
from fasodata.dashboard.schemas import (
    AlertRuleCreate,
    AlertRuleOut,
    AlertRuleUpdate,
    DashboardOverviewOut,
    DashboardPreferenceOut,
    DashboardPreferenceUpdate,
    DashboardRegionSummaryOut,
    DashboardRecommendationOut,
    QualityCheckCreate,
    QualityCheckOut,
    QualityCheckUpdate,
    QualityIssueCorrection,
    QualityIssueOut,
    ProgramCreate,
    ProgramDetailOut,
    ProgramOut,
    ProgramPriceAlertCreate,
    ProgramPriceAlertOut,
    ProgramPriceAlertUpdate,
    ProgramScenarioCreate,
    ProgramScenarioOut,
    ProgramScenarioUpdate,
    ProgramUpdate,
    SystemMetricCreate,
    SystemMetricOut,
    TeamMemberCreate,
    TeamMemberOut,
    TeamMemberUpdate,
)
from fasodata.datasets.models import Dataset, DatasetStatus
from fasodata.prices.models import PriceData
from fasodata.users.models import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DEFAULT_DASHBOARD_PREFERENCES = {
    "domains": ["prices"],
    "data_types": ["time_series", "maps"],
    "regions": ["National"],
}


async def _quality_check_out(db: AsyncSession, check: QualityCheck) -> QualityCheckOut:
    issues_result = await db.execute(
        select(QualityIssue)
        .where(QualityIssue.check_id == check.id)
        .order_by(QualityIssue.created_at.desc())
    )
    issues = issues_result.scalars().all()
    data = QualityCheckOut.model_validate(check).model_dump()
    data["issues"] = [QualityIssueOut.model_validate(issue) for issue in issues]
    return QualityCheckOut(**data)


async def _program_detail_out(db: AsyncSession, program: Program) -> ProgramDetailOut:
    alerts_result = await db.execute(
        select(ProgramPriceAlert)
        .where(ProgramPriceAlert.program_id == program.id)
        .order_by(ProgramPriceAlert.created_at.desc())
    )
    scenarios_result = await db.execute(
        select(ProgramScenario)
        .where(ProgramScenario.program_id == program.id)
        .order_by(ProgramScenario.created_at.desc())
    )
    data = ProgramOut.model_validate(program).model_dump()
    data["alerts"] = [ProgramPriceAlertOut.model_validate(item) for item in alerts_result.scalars().all()]
    data["scenarios"] = [ProgramScenarioOut.model_validate(item) for item in scenarios_result.scalars().all()]
    return ProgramDetailOut(**data)


async def _get_or_create_dashboard_preferences(db: AsyncSession, user: User) -> DashboardPreference:
    result = await db.execute(
        select(DashboardPreference).where(DashboardPreference.user_id == user.id)
    )
    preference = result.scalar_one_or_none()
    if preference:
        return preference

    preference = DashboardPreference(user_id=user.id, **DEFAULT_DASHBOARD_PREFERENCES)
    db.add(preference)
    await db.flush()
    return preference


async def _ensure_default_food_program(db: AsyncSession, user: User | None = None) -> Program:
    result = await db.execute(
        select(Program).where(
            Program.sector == "food_prices",
            Program.name == "Suivi des prix alimentaires",
        )
    )
    program = result.scalar_one_or_none()
    if program:
        return program
    program = Program(
        name="Suivi des prix alimentaires",
        description="Suivi des prix des cereales et produits alimentaires strategiques.",
        sector="food_prices",
        period="12m",
        owner_id=user.id if user else None,
        metadata_json={"default": True},
    )
    db.add(program)
    await db.flush()
    return program


REGIONS = [
    {"name": "Sahel", "chef": "Dori", "beneficiaires": 3214, "prix_mais": 342, "indicateur": 82, "objectif": 90},
    {"name": "Centre", "chef": "Ouagadougou", "beneficiaires": 2876, "prix_mais": 320, "indicateur": 78, "objectif": 85},
    {"name": "Est", "chef": "Fada N'Gourma", "beneficiaires": 1987, "prix_mais": 328, "indicateur": 71, "objectif": 80},
    {"name": "Hauts-Bassins", "chef": "Bobo-Dioulasso", "beneficiaires": 1532, "prix_mais": 295, "indicateur": 86, "objectif": 90},
    {"name": "Nord", "chef": "Ouahigouya", "beneficiaires": 1421, "prix_mais": 318, "indicateur": 75, "objectif": 85},
    {"name": "Centre-Nord", "chef": "Kaya", "beneficiaires": 712, "prix_mais": 305, "indicateur": 77, "objectif": 82},
    {"name": "Boucle du M.", "chef": "Dedougou", "beneficiaires": 856, "prix_mais": 298, "indicateur": 68, "objectif": 78},
    {"name": "Plateau Central", "chef": "Ziniare", "beneficiaires": 601, "prix_mais": 294, "indicateur": 73, "objectif": 80},
    {"name": "Centre-Ouest", "chef": "Koudougou", "beneficiaires": 748, "prix_mais": 288, "indicateur": 79, "objectif": 85},
    {"name": "Centre-Sud", "chef": "Manga", "beneficiaires": 523, "prix_mais": 280, "indicateur": 65, "objectif": 75},
    {"name": "Centre-Est", "chef": "Tenkodogo", "beneficiaires": 634, "prix_mais": 285, "indicateur": 70, "objectif": 78},
    {"name": "Sud-Ouest", "chef": "Diebougou", "beneficiaires": 389, "prix_mais": 278, "indicateur": 62, "objectif": 72},
    {"name": "Cascades", "chef": "Banfora", "beneficiaires": 445, "prix_mais": 270, "indicateur": 84, "objectif": 88},
]


def _percent_change(current: int | float, previous: int | float) -> float:
    if previous == 0:
        return 100.0 if current else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _bucket_counts(dates: list[date | datetime], today: date) -> list[int]:
    start = today - timedelta(days=55)
    buckets = [0] * 8
    for value in dates:
        current = value.date() if isinstance(value, datetime) else value
        if current < start or current > today:
            continue
        index = min(7, max(0, (current - start).days // 7))
        buckets[index] += 1
    return buckets


def _preference_regions(preference: DashboardPreference) -> list[str]:
    return [region for region in (preference.regions or []) if region != "National"]


def _preference_program_sectors(preference: DashboardPreference) -> list[str]:
    mapping = {
        "prices": "food_prices",
        "health": "health",
        "education": "education",
        "water": "water",
        "territory": "territory",
    }
    return [mapping[domain] for domain in (preference.domains or []) if domain in mapping]


def _preference_dataset_filter(preference: DashboardPreference):
    clauses = [
        _dataset_match_filter(DOMAIN_KEYWORDS[domain])
        for domain in (preference.domains or [])
        if domain in DOMAIN_KEYWORDS
    ]
    return or_(*clauses) if clauses else None


@router.get("/overview", response_model=DashboardOverviewOut)
async def dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _ensure_default_food_program(db, current_user)
    preference = await _get_or_create_dashboard_preferences(db, current_user)
    selected_regions = _preference_regions(preference)
    program_sectors = _preference_program_sectors(preference)
    dataset_filter = _preference_dataset_filter(preference)

    today = date.today()
    current_start = today - timedelta(days=30)
    previous_start = today - timedelta(days=60)
    spark_start = today - timedelta(days=55)

    async def count(query):
        result = await db.execute(query)
        return int(result.scalar_one() or 0)

    program_filters = [
        Program.status == ProgramStatus.active,
        Program.owner_id == current_user.id,
    ]
    if program_sectors:
        program_filters.append(Program.sector.in_(program_sectors))

    active_programs = await count(
        select(func.count(Program.id)).where(*program_filters)
    )
    current_programs = await count(
        select(func.count(Program.id)).where(
            *program_filters,
            Program.created_at >= datetime.combine(current_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    previous_programs = await count(
        select(func.count(Program.id)).where(
            *program_filters,
            Program.created_at >= datetime.combine(previous_start, datetime.min.time(), tzinfo=timezone.utc),
            Program.created_at < datetime.combine(current_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )

    price_filters = [PriceData.country == "BFA"]
    if "prices" not in (preference.domains or []):
        price_filters.append(PriceData.id.is_(None))
    if selected_regions:
        price_filters.append(PriceData.region.in_(selected_regions))

    price_total = await count(select(func.count(PriceData.id)).where(*price_filters))
    price_current = await count(
        select(func.count(PriceData.id)).where(*price_filters, PriceData.price_date >= current_start)
    )
    price_previous = await count(
        select(func.count(PriceData.id)).where(
            *price_filters,
            PriceData.price_date >= previous_start,
            PriceData.price_date < current_start,
        )
    )

    dataset_filters = [Dataset.status == DatasetStatus.published]
    if dataset_filter is not None:
        dataset_filters.append(dataset_filter)

    datasets_total = await count(
        select(func.count(Dataset.id)).where(*dataset_filters)
    )
    datasets_current = await count(
        select(func.count(Dataset.id)).where(
            *dataset_filters,
            Dataset.published_at >= datetime.combine(current_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    datasets_previous = await count(
        select(func.count(Dataset.id)).where(
            *dataset_filters,
            Dataset.published_at >= datetime.combine(previous_start, datetime.min.time(), tzinfo=timezone.utc),
            Dataset.published_at < datetime.combine(current_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )

    alert_filters = [
        ProgramPriceAlert.is_triggered.is_(True),
        ProgramPriceAlert.created_by_id == current_user.id,
    ]
    if selected_regions:
        alert_filters.append(ProgramPriceAlert.region.in_(selected_regions))

    triggered_alerts = await count(
        select(func.count(ProgramPriceAlert.id)).where(*alert_filters)
    )
    alerts_current = await count(
        select(func.count(ProgramPriceAlert.id)).where(
            *alert_filters,
            ProgramPriceAlert.created_at >= datetime.combine(current_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    alerts_previous = await count(
        select(func.count(ProgramPriceAlert.id)).where(
            *alert_filters,
            ProgramPriceAlert.created_at >= datetime.combine(previous_start, datetime.min.time(), tzinfo=timezone.utc),
            ProgramPriceAlert.created_at < datetime.combine(current_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )

    price_dates_result = await db.execute(
        select(PriceData.price_date).where(*price_filters, PriceData.price_date >= spark_start)
    )
    program_dates_result = await db.execute(
        select(Program.created_at).where(
            *program_filters,
            Program.created_at >= datetime.combine(spark_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    dataset_dates_result = await db.execute(
        select(Dataset.published_at).where(
            *dataset_filters,
            Dataset.published_at.is_not(None),
            Dataset.published_at >= datetime.combine(spark_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    alert_dates_result = await db.execute(
        select(ProgramPriceAlert.created_at).where(
            *alert_filters,
            ProgramPriceAlert.created_at >= datetime.combine(spark_start, datetime.min.time(), tzinfo=timezone.utc),
        )
    )

    return DashboardOverviewOut(
        updated_at=datetime.now(timezone.utc),
        period="30 derniers jours",
        kpis=[
            {
                "key": "programs",
                "label": "Programmes actifs",
                "value": active_programs,
                "sub": "programmes suivis",
                "change": _percent_change(current_programs, previous_programs),
                "spark": _bucket_counts(program_dates_result.scalars().all(), today),
            },
            {
                "key": "price_observations",
                "label": "Observations prix",
                "value": price_total,
                "sub": f"{price_current} nouvelles",
                "change": _percent_change(price_current, price_previous),
                "spark": _bucket_counts(price_dates_result.scalars().all(), today),
            },
            {
                "key": "datasets",
                "label": "Datasets publiés",
                "value": datasets_total,
                "sub": "catalogue public",
                "change": _percent_change(datasets_current, datasets_previous),
                "spark": _bucket_counts(dataset_dates_result.scalars().all(), today),
            },
            {
                "key": "alerts",
                "label": "Alertes déclenchées",
                "value": triggered_alerts,
                "sub": "seuils actifs",
                "change": _percent_change(alerts_current, alerts_previous),
                "spark": _bucket_counts(alert_dates_result.scalars().all(), today),
            },
        ],
    )


@router.get("/preferences", response_model=DashboardPreferenceOut)
async def get_dashboard_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return await _get_or_create_dashboard_preferences(db, current_user)


@router.put("/preferences", response_model=DashboardPreferenceOut)
async def upsert_dashboard_preferences(
    data: DashboardPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not data.domains:
        raise HTTPException(422, detail="Choisissez au moins un domaine de suivi")
    if not data.data_types:
        raise HTTPException(422, detail="Choisissez au moins un type de donnees")

    result = await db.execute(
        select(DashboardPreference).where(DashboardPreference.user_id == current_user.id)
    )
    preference = result.scalar_one_or_none()
    values = {
        "domains": data.domains,
        "data_types": data.data_types,
        "regions": data.regions or ["National"],
    }
    if preference:
        for field, value in values.items():
            setattr(preference, field, value)
        preference.is_configured = True
    else:
        preference = DashboardPreference(user_id=current_user.id, is_configured=True, **values)
        db.add(preference)
    await db.flush()
    return preference


DOMAIN_KEYWORDS = {
    "prices": ["prix", "cereales", "céréales", "agriculture", "marches", "marchés", "wfp"],
    "health": ["sante", "santé", "vaccination", "nutrition"],
    "education": ["education", "éducation", "ecole", "école", "enseign"],
    "water": ["eau", "assainissement", "forage", "hydraulique"],
    "territory": ["carte", "geo", "géographie", "region", "région", "territoire"],
}

DOMAIN_LABELS = {
    "prices": "Prix alimentaires",
    "health": "Santé",
    "education": "Éducation",
    "water": "Eau & assainissement",
    "territory": "Territoires",
}


def _dataset_match_filter(keywords: list[str]):
    clauses = []
    for keyword in keywords:
        pattern = f"%{keyword}%"
        clauses.extend([
            Dataset.name.ilike(pattern),
            Dataset.description.ilike(pattern),
            Dataset.category.ilike(pattern),
            Dataset.source.ilike(pattern),
        ])
    return or_(*clauses)


@router.get("/recommendations", response_model=list[DashboardRecommendationOut])
async def dashboard_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    preference = await _get_or_create_dashboard_preferences(db, current_user)
    domains = preference.domains or DEFAULT_DASHBOARD_PREFERENCES["domains"]
    data_types = preference.data_types or DEFAULT_DASHBOARD_PREFERENCES["data_types"]
    regions = preference.regions or DEFAULT_DASHBOARD_PREFERENCES["regions"]
    selected_regions = [region for region in regions if region != "National"]

    recommendations: list[dict] = []

    if "prices" in domains:
        price_filters = [PriceData.country == "BFA"]
        if selected_regions:
            price_filters.append(PriceData.region.in_(selected_regions))
        latest_result = await db.execute(
            select(
                func.max(PriceData.price_date),
                func.count(PriceData.id),
                func.count(func.distinct(PriceData.market)),
                func.count(func.distinct(PriceData.region)),
            )
            .where(*price_filters)
        )
        latest_date, observations, markets, price_regions = latest_result.one()
        coverage_detail = f"{int(markets or 0)} marchés" if markets else f"{int(price_regions or 0)} régions"
        recommendations.append({
            "key": "prices-wfp",
            "title": "Suivi des prix alimentaires",
            "text": "Dernières observations WFP/SMS filtrées selon vos régions de veille.",
            "href": "/dashboard/prix",
            "kind": "prices",
            "source": "WFP + FasoData SMS",
            "metric": f"{int(observations or 0):,}".replace(",", " ") + " observations",
            "detail": coverage_detail + (f" · dernière donnée {latest_date.isoformat()}" if latest_date else ""),
            "icon": "wheat",
        })

    if "alerts" in data_types:
        rule_count = await db.scalar(
            select(func.count(AlertRule.id)).where(AlertRule.created_by_id == current_user.id)
        )
        triggered_count = await db.scalar(
            select(func.count(ProgramPriceAlert.id)).where(
                ProgramPriceAlert.created_by_id == current_user.id,
                ProgramPriceAlert.is_triggered.is_(True),
            )
        )
        recommendations.append({
            "key": "alerts-rules",
            "title": "Alertes à configurer",
            "text": "Surveillez automatiquement les seuils qui comptent pour vos domaines.",
            "href": "/dashboard/alertes",
            "kind": "alerts",
            "source": "Règles FasoData",
            "metric": f"{int(rule_count or 0)} règles",
            "detail": f"{int(triggered_count or 0)} alertes déclenchées",
            "icon": "bell",
        })

    if "maps" in data_types or "territory" in domains:
        geo_count = await db.scalar(
            select(func.count(Dataset.id)).where(
                Dataset.status == DatasetStatus.published,
                Dataset.is_geo.is_(True),
            )
        )
        price_region_count = await db.scalar(
            select(func.count(func.distinct(PriceData.region))).where(PriceData.country == "BFA")
        )
        recommendations.append({
            "key": "map-layers",
            "title": "Carte interactive",
            "text": "Calques géographiques et indicateurs régionaux disponibles pour votre veille.",
            "href": "/carte",
            "kind": "map",
            "source": "Catalogue + prix régionaux",
            "metric": f"{int(price_region_count or 0)} régions prix",
            "detail": f"{int(geo_count or 0)} datasets géographiques publiés",
            "icon": "map",
        })

    if "datasets" in data_types:
        for domain in domains:
            keywords = DOMAIN_KEYWORDS.get(domain, [])
            if not keywords:
                continue
            query = select(Dataset).where(
                Dataset.status == DatasetStatus.published,
                _dataset_match_filter(keywords),
            )
            if domain == "prices":
                query = query.order_by(
                    (Dataset.slug == "prix-alimentaires-burkina-faso").desc(),
                    Dataset.updated_at.desc(),
                )
            else:
                query = query.order_by(Dataset.updated_at.desc())
            query = query.limit(1)
            result = await db.execute(query)
            dataset = result.scalar_one_or_none()
            total = await db.scalar(
                select(func.count(Dataset.id)).where(
                    Dataset.status == DatasetStatus.published,
                    _dataset_match_filter(keywords),
                )
            )
            label = DOMAIN_LABELS.get(domain, domain)
            recommendations.append({
                "key": f"datasets-{domain}",
                "title": f"Datasets {label.lower()}",
                "text": dataset.description[:110] if dataset and dataset.description else f"Jeux de données publiés liés à {label.lower()}.",
                "href": f"/datasets/{dataset.slug}" if dataset else f"/datasets?category={label}",
                "kind": "dataset",
                "source": dataset.source if dataset and dataset.source else "Catalogue FasoData",
                "metric": f"{int(total or 0)} datasets",
                "detail": dataset.name if dataset else "Catalogue public",
                "icon": "database",
            })

    if not recommendations:
        recommendations.append({
            "key": "catalog",
            "title": "Catalogue public",
            "text": "Explorez les datasets publiés et affinez vos préférences de veille.",
            "href": "/datasets",
            "kind": "dataset",
            "source": "Catalogue FasoData",
            "metric": None,
            "detail": None,
            "icon": "database",
        })

    return recommendations[:6]


@router.get("/regions/summary", response_model=list[DashboardRegionSummaryOut])
async def dashboard_region_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    preference = await _get_or_create_dashboard_preferences(db, current_user)
    selected_regions = _preference_regions(preference)

    query = (
        select(
            PriceData.region,
            func.count(PriceData.id).label("observations"),
            func.avg(PriceData.price).label("avg_price"),
            func.max(PriceData.price_date).label("latest_date"),
        )
        .where(PriceData.country == "BFA")
        .group_by(PriceData.region)
        .order_by(func.count(PriceData.id).desc())
    )
    if selected_regions:
        query = query.where(PriceData.region.in_(selected_regions))

    result = await db.execute(query.limit(12))
    return [
        {
            "region": row.region or "National",
            "observations": int(row.observations or 0),
            "avg_price": round(float(row.avg_price or 0), 1),
            "latest_date": row.latest_date,
        }
        for row in result.all()
    ]


@router.get("/programs", response_model=list[ProgramOut])
async def list_programs(
    sector: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _ensure_default_food_program(db, current_user)
    query = select(Program)
    if sector:
        query = query.where(Program.sector == sector)
    result = await db.execute(query.order_by(Program.created_at.desc()))
    return result.scalars().all()


@router.post("/programs", response_model=ProgramOut, status_code=201)
async def create_program(
    data: ProgramCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    program = Program(**data.model_dump(), owner_id=current_user.id)
    db.add(program)
    await db.flush()
    return program


@router.get("/programs/{program_id}", response_model=ProgramDetailOut)
async def get_program(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(404, detail="Programme introuvable")
    return await _program_detail_out(db, program)


@router.patch("/programs/{program_id}", response_model=ProgramOut)
async def update_program(
    program_id: uuid.UUID,
    data: ProgramUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(404, detail="Programme introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(program, field, value)
    return program


@router.delete("/programs/{program_id}", status_code=204)
async def delete_program(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(404, detail="Programme introuvable")
    await db.delete(program)


@router.get("/programs/{program_id}/alerts", response_model=list[ProgramPriceAlertOut])
async def list_program_alerts(
    program_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(ProgramPriceAlert)
        .where(ProgramPriceAlert.program_id == program_id)
        .order_by(ProgramPriceAlert.created_at.desc())
    )
    return result.scalars().all()


@router.post("/programs/{program_id}/alerts", response_model=ProgramPriceAlertOut, status_code=201)
async def create_program_alert(
    program_id: uuid.UUID,
    data: ProgramPriceAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    program_result = await db.execute(select(Program).where(Program.id == program_id))
    if not program_result.scalar_one_or_none():
        raise HTTPException(404, detail="Programme introuvable")
    current_price = data.current_price
    if current_price is None:
        from fasodata.prices.models import PriceData

        price_result = await db.execute(
            select(PriceData)
            .where(PriceData.commodity == data.commodity, PriceData.region == data.region)
            .order_by(PriceData.price_date.desc(), PriceData.created_at.desc())
            .limit(1)
        )
        latest = price_result.scalar_one_or_none()
        current_price = latest.price if latest else None
    alert = ProgramPriceAlert(
        **data.model_dump(exclude={"current_price"}),
        program_id=program_id,
        current_price=current_price,
        is_triggered=bool(current_price is not None and current_price > data.threshold_price),
        created_by_id=current_user.id,
    )
    db.add(alert)
    await db.flush()
    return alert


@router.patch("/programs/{program_id}/alerts/{alert_id}", response_model=ProgramPriceAlertOut)
async def update_program_alert(
    program_id: uuid.UUID,
    alert_id: uuid.UUID,
    data: ProgramPriceAlertUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(
        select(ProgramPriceAlert).where(
            ProgramPriceAlert.id == alert_id,
            ProgramPriceAlert.program_id == program_id,
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, detail="Alerte programme introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(alert, field, value)
    if data.current_price is not None or data.threshold_price is not None:
        alert.is_triggered = bool((alert.current_price or 0) > alert.threshold_price)
    return alert


@router.delete("/programs/{program_id}/alerts/{alert_id}", status_code=204)
async def delete_program_alert(
    program_id: uuid.UUID,
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(
        select(ProgramPriceAlert).where(
            ProgramPriceAlert.id == alert_id,
            ProgramPriceAlert.program_id == program_id,
        )
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, detail="Alerte programme introuvable")
    await db.delete(alert)


@router.post("/programs/{program_id}/scenarios", response_model=ProgramScenarioOut, status_code=201)
async def create_program_scenario(
    program_id: uuid.UUID,
    data: ProgramScenarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    program_result = await db.execute(select(Program).where(Program.id == program_id))
    if not program_result.scalar_one_or_none():
        raise HTTPException(404, detail="Programme introuvable")
    scenario = ProgramScenario(**data.model_dump(), program_id=program_id, created_by_id=current_user.id)
    db.add(scenario)
    await db.flush()
    return scenario


@router.patch("/programs/{program_id}/scenarios/{scenario_id}", response_model=ProgramScenarioOut)
async def update_program_scenario(
    program_id: uuid.UUID,
    scenario_id: uuid.UUID,
    data: ProgramScenarioUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(
        select(ProgramScenario).where(
            ProgramScenario.id == scenario_id,
            ProgramScenario.program_id == program_id,
        )
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(404, detail="Scenario introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(scenario, field, value)
    return scenario


@router.delete("/programs/{program_id}/scenarios/{scenario_id}", status_code=204)
async def delete_program_scenario(
    program_id: uuid.UUID,
    scenario_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(
        select(ProgramScenario).where(
            ProgramScenario.id == scenario_id,
            ProgramScenario.program_id == program_id,
        )
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(404, detail="Scenario introuvable")
    await db.delete(scenario)


@router.get("/food-prices")
async def food_prices():
    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "commodities": [
            {"name": "Mais", "price": 325, "change": 8.4, "color": "#E04E2F", "data": [265, 272, 280, 291, 298, 310, 318, 325]},
            {"name": "Mil", "price": 370, "change": 5.1, "color": "#1A2C42", "data": [340, 344, 348, 352, 356, 360, 366, 370]},
            {"name": "Sorgho", "price": 312, "change": 3.2, "color": "#16A34A", "data": [295, 298, 300, 303, 306, 308, 310, 312]},
            {"name": "Riz local", "price": 520, "change": 12.7, "color": "#F59E0B", "data": [445, 458, 470, 480, 490, 502, 510, 520]},
            {"name": "Haricot", "price": 780, "change": -2.1, "color": "#8B5CF6", "data": [810, 806, 802, 798, 794, 790, 784, 780]},
        ],
        "price_evolution": [
            {"month": "M44", "sahel": 240, "centre": 235, "hauts": 228, "cascades": 222},
            {"month": "M52", "sahel": 248, "centre": 240, "hauts": 232, "cascades": 226},
            {"month": "W8", "sahel": 258, "centre": 248, "hauts": 238, "cascades": 232},
            {"month": "W16", "sahel": 272, "centre": 258, "hauts": 246, "cascades": 238},
            {"month": "W24", "sahel": 285, "centre": 268, "hauts": 254, "cascades": 248},
            {"month": "W32", "sahel": 305, "centre": 285, "hauts": 264, "cascades": 256},
            {"month": "W40", "sahel": 328, "centre": 305, "hauts": 278, "cascades": 262},
            {"month": "W42", "sahel": 342, "centre": 320, "hauts": 285, "cascades": 270},
        ],
        "regions": REGIONS,
        "volatility": [
            {"name": "Riz local", "sigma": 38},
            {"name": "Mais", "sigma": 31},
            {"name": "Mil", "sigma": 24},
            {"name": "Sorgho", "sigma": 19},
            {"name": "Haricot", "sigma": 14},
            {"name": "Niebe", "sigma": 11},
        ],
        "thresholds": [
            {"name": "Mais - Sahel", "threshold": "Seuil > 320 CFA/kg", "value": 342, "severity": "critical"},
            {"name": "Riz local - National", "threshold": "Seuil > 500 CFA/kg", "value": 520, "severity": "critical"},
            {"name": "Mil - Nord", "threshold": "Seuil > 380 CFA/kg", "value": 375, "severity": "warning"},
            {"name": "Sorgho - Centre", "threshold": "Seuil > 320 CFA/kg", "value": 305, "severity": "ok"},
        ],
    }


@router.get("/alerts")
async def alerts(db: AsyncSession = Depends(get_db)):
    rules_result = await db.execute(select(AlertRule).order_by(AlertRule.created_at.desc()).limit(20))
    stored_rules = rules_result.scalars().all()
    fallback_rules = [
        {"name": "Prix du mil - Sahel", "threshold": "> 320 CFA/kg", "channel": "Email + SMS", "status": "active"},
        {"name": "Couverture vaccinale", "threshold": "< 72%", "channel": "Email", "status": "active"},
        {"name": "Pluviometrie extreme", "threshold": "> 150 mm/24h", "channel": "Webhook", "status": "paused"},
    ]
    return {
        "items": [
            {"id": 1, "title": "Prix du mil > seuil critique", "location": "Sahel - Dori", "time": "il y a 32 min", "value": "+24% en 7j", "severity": "critical"},
            {"id": 2, "title": "Couverture vaccinale en baisse", "location": "Est - Fada", "time": "il y a 2h", "value": "-3.2 pts", "severity": "warning"},
            {"id": 3, "title": "Dataset partenaire mis a jour", "location": "INSD - IPC", "time": "il y a 4h", "value": "nouvelle version", "severity": "info"},
            {"id": 4, "title": "Precipitations exceptionnelles", "location": "Cascades - Banfora", "time": "hier", "value": "+180 mm/24h", "severity": "warning"},
        ],
        "rules": [
            {
                "name": rule.name,
                "threshold": f"{rule.comparator} {rule.threshold_value:g} {rule.unit or ''}".strip(),
                "channel": " + ".join(rule.channels or []),
                "status": rule.status.value,
            }
            for rule in stored_rules
        ] or fallback_rules,
    }


@router.get("/supervision")
async def supervision(db: AsyncSession = Depends(get_db)):
    metrics_result = await db.execute(
        select(SystemMetric)
        .order_by(SystemMetric.recorded_at.desc())
        .limit(20)
    )
    stored_metrics = metrics_result.scalars().all()

    metric_services = [
        {
            "name": metric.service,
            "desc": metric.label,
            "version": metric.metric_key,
            "uptime": f"{metric.value:g}{metric.unit or ''}",
            "latency": "-",
            "status": metric.status.value,
        }
        for metric in stored_metrics[:6]
    ]

    metric_resources = [
        {
            "label": metric.label,
            "value": int(metric.value),
            "detail": metric.metadata_json.get("detail", metric.metric_key) if metric.metadata_json else metric.metric_key,
        }
        for metric in stored_metrics
        if metric.metric_key in {"cpu", "memory", "db_storage", "object_storage", "bandwidth"}
    ]

    fallback_services = [
        {"name": "API REST", "desc": "app.fasodata.bf", "version": "v1.4.2", "uptime": "99.98%", "latency": "142 ms", "status": "ok"},
        {"name": "Base PostgreSQL", "desc": "cluster primaire - 3 noeuds", "version": "15.3", "uptime": "99.99%", "latency": "8 ms", "status": "ok"},
        {"name": "PostGIS / SIG", "desc": "extension activee", "version": "3.4", "uptime": "99.92%", "latency": "24 ms", "status": "ok"},
        {"name": "Stockage MinIO", "desc": "4.2 To utilises / 10 To", "version": "S3", "uptime": "100%", "latency": "18 ms", "status": "ok"},
        {"name": "Meilisearch", "desc": "CPU eleve sur node-2", "version": "1.8", "uptime": "99.87%", "latency": "62 ms", "status": "warn"},
        {"name": "Worker imports", "desc": "queue : 12 jobs", "version": "4 actifs", "uptime": "100%", "latency": "-", "status": "ok"},
    ]
    fallback_resources = [
        {"label": "CPU", "value": 48, "detail": "4 vCPU - 8 coeurs"},
        {"label": "Memoire", "value": 62, "detail": "9.9 Go / 16 Go"},
        {"label": "Stockage BDD", "value": 71, "detail": "142 Go / 200 Go"},
        {"label": "Stockage objet", "value": 42, "detail": "4.2 To / 10 To"},
        {"label": "Bande passante", "value": 35, "detail": "350 Mbps / 1 Gbps"},
    ]

    return {
        "status": "operational",
        "last_check": "il y a 12 s",
        "kpis": [
            {"label": "Uptime 30j", "value": "99.94", "unit": "%", "sub": "objectif 99.5%"},
            {"label": "Temps reponse API", "value": "142", "unit": "ms", "sub": "cible < 200 ms"},
            {"label": "Requetes / h", "value": "8.2k", "unit": "", "sub": "+12% vs hier"},
            {"label": "Erreurs 5xx", "value": "0.03", "unit": "%", "sub": "cible < 0.5%"},
        ],
        "services": metric_services if len(metric_services) >= 3 else fallback_services,
        "resources": metric_resources if len(metric_resources) >= 3 else fallback_resources,
    }


@router.get("/validation")
async def validation_quality(db: AsyncSession = Depends(get_db)):
    check_result = await db.execute(select(QualityCheck).order_by(QualityCheck.created_at.desc()).limit(1))
    check = check_result.scalar_one_or_none()
    if check:
        issues_result = await db.execute(
            select(QualityIssue)
            .where(QualityIssue.check_id == check.id)
            .order_by(QualityIssue.created_at.desc())
            .limit(12)
        )
        issues = issues_result.scalars().all()
        return {
            "dataset": {"check_id": str(check.id), "name": check.dataset_slug or "dataset", "rows": check.total_rows, "flagged": check.flagged_rows, "reviewer": "Equipe qualite"},
            "summary": {"score": check.score, "status": "Acceptable" if check.score >= 80 else "A revoir", "target": ">= 90", "completeness": check.completeness, "coherence": check.coherence, "duplicates": check.duplicate_count},
            "rows": [
                {"issue_id": str(issue.id), "line": issue.line_number or 0, "column": issue.column_name or "-", "value": issue.raw_value or "-", "problem": issue.problem, "suggestion": issue.suggestion or "-", "action": "Corriger" if not issue.suggestion else "Appliquer"}
                for issue in issues
                if not issue.is_resolved
            ],
            "problems": [
                {"name": issue.problem, "count": 1, "tone": "red" if issue.severity.value in {"high", "critical"} else "amber"}
                for issue in issues[:5]
            ],
            "history": [
                {"actor": "QA", "label": "Controle qualite charge depuis la base", "time": "maintenant"},
            ],
        }

    return {
        "dataset": {"check_id": None, "name": "enquete_sante_q1_2025", "rows": 2847, "flagged": 47, "reviewer": "Dr. Sory Traore"},
        "summary": {"score": 83, "status": "Acceptable", "target": ">= 90", "completeness": 94, "coherence": 89, "duplicates": 12},
        "rows": [
            {"issue_id": None, "line": 47, "column": "date_enr", "value": "2026-03-12", "problem": "Date dans le futur", "suggestion": "-", "action": "Corriger"},
            {"issue_id": None, "line": 102, "column": "id_enq", "value": "EQ-2025-001", "problem": "Doublon (ligne 23)", "suggestion": "-", "action": "Corriger"},
            {"issue_id": None, "line": 134, "column": "commune", "value": "Wagadougou", "problem": "Commune non reconnue", "suggestion": "Ouagadougou", "action": "Appliquer"},
            {"issue_id": None, "line": 256, "column": "temp_c", "value": "43.8", "problem": "Valeur aberrante (> 42C)", "suggestion": "-", "action": "Corriger"},
            {"issue_id": None, "line": 312, "column": "commune", "value": "Bobo-D", "problem": "Forme abregee", "suggestion": "Bobo-Dioulasso", "action": "Appliquer"},
            {"line": 418, "column": "observation", "value": "ø", "problem": "Manquant", "suggestion": "-", "action": "Corriger"},
            {"issue_id": None, "line": 901, "column": "date_enr", "value": "14/01/2025", "problem": "Format date non standard", "suggestion": "2025-01-14", "action": "Appliquer"},
        ],
        "problems": [
            {"name": "Doublons sur ID enquete", "count": 12, "tone": "red"},
            {"name": "Dates dans le futur", "count": 3, "tone": "red"},
            {"name": "Valeurs aberrantes", "count": 8, "tone": "amber"},
            {"name": "Commune non reconnue", "count": 6, "tone": "amber"},
            {"name": "Valeurs manquantes", "count": 18, "tone": "slate"},
        ],
        "history": [
            {"actor": "AS", "label": "Import du fichier source", "time": "il y a 1 h"},
            {"actor": "AI", "label": "Controles automatiques executes", "time": "il y a 44 min"},
            {"actor": "AS", "label": "Mappage des colonnes applique", "time": "il y a 30 min"},
            {"actor": "ST", "label": "Revue commencee", "time": "il y a 16 min"},
        ],
    }


@router.get("/organizations")
async def organizations(db: AsyncSession = Depends(get_db)):
    users_by_org_result = await db.execute(
        select(User.organization, func.count(User.id))
        .where(User.organization.is_not(None))
        .group_by(User.organization)
        .order_by(func.count(User.id).desc())
    )
    dataset_total_result = await db.execute(select(func.count(Dataset.id)))
    user_total_result = await db.execute(select(func.count(User.id)))

    dataset_total = dataset_total_result.scalar_one()
    user_total = user_total_result.scalar_one()
    grouped = users_by_org_result.all()

    fallback = [
        {"name": "ACEEDO", "type": "ONG nationale", "datasets": 18, "users": 24, "status": "Verifiee"},
        {"name": "INSD", "type": "Institution publique", "datasets": 42, "users": 16, "status": "Verifiee"},
        {"name": "Ministere de la Sante", "type": "Administration", "datasets": 31, "users": 38, "status": "Verifiee"},
        {"name": "OCHA Burkina Faso", "type": "Agence internationale", "datasets": 12, "users": 9, "status": "En revue"},
    ]

    items = [
        {
            "name": org or "Organisation non renseignee",
            "type": "Organisation partenaire",
            "datasets": max(1, dataset_total // max(1, len(grouped))) if dataset_total else 0,
            "users": count,
            "status": "Verifiee",
        }
        for org, count in grouped
    ] or fallback

    return {
        "kpis": {
            "organizations": len(items),
            "verified": sum(1 for item in items if item["status"] == "Verifiee"),
            "datasets": dataset_total or sum(item["datasets"] for item in items),
            "regions": "13/13",
            "users": user_total or sum(item["users"] for item in items),
        },
        "items": items,
    }


@router.get("/alert-rules", response_model=list[AlertRuleOut])
async def list_alert_rules(
    status: str | None = None,
    metric_key: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(AlertRule)
    if status:
        query = query.where(AlertRule.status == status)
    if metric_key:
        query = query.where(AlertRule.metric_key == metric_key)
    result = await db.execute(query.order_by(AlertRule.created_at.desc()))
    return result.scalars().all()


@router.post("/alert-rules", response_model=AlertRuleOut, status_code=201)
async def create_alert_rule(
    data: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    rule = AlertRule(**data.model_dump(), created_by_id=current_user.id)
    db.add(rule)
    await db.flush()
    return rule


@router.patch("/alert-rules/{rule_id}", response_model=AlertRuleOut)
async def update_alert_rule(
    rule_id: uuid.UUID,
    data: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, detail="Regle d'alerte introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(rule, field, value)
    return rule


@router.delete("/alert-rules/{rule_id}", status_code=204)
async def delete_alert_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, detail="Regle d'alerte introuvable")
    await db.delete(rule)


@router.get("/system-metrics", response_model=list[SystemMetricOut])
async def list_system_metrics(
    service: str | None = None,
    metric_key: str | None = None,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(SystemMetric)
    if service:
        query = query.where(SystemMetric.service == service)
    if metric_key:
        query = query.where(SystemMetric.metric_key == metric_key)
    result = await db.execute(query.order_by(SystemMetric.recorded_at.desc()).limit(limit))
    return result.scalars().all()


@router.post("/system-metrics", response_model=SystemMetricOut, status_code=201)
async def create_system_metric(
    data: SystemMetricCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    metric = SystemMetric(**data.model_dump())
    db.add(metric)
    await db.flush()
    return metric


@router.get("/team-members", response_model=list[TeamMemberOut])
async def list_team_members(
    organization: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    query = select(TeamMember)
    if organization:
        query = query.where(TeamMember.organization == organization)
    result = await db.execute(query.order_by(TeamMember.invited_at.desc()))
    return result.scalars().all()


@router.post("/team-members", response_model=TeamMemberOut, status_code=201)
async def create_team_member(
    data: TeamMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    from fasodata.core.config import get_settings
    settings = get_settings()

    member = TeamMember(**data.model_dump(), invited_by_id=current_user.id)
    db.add(member)
    await db.flush()

    # Envoyer l'email d'invitation
    try:
        from fasodata.alerts.email_service import send_invitation_email
        inviter_name = current_user.full_name or current_user.email
        register_url = f"{settings.public_app_base_url}/auth/inscription"
        send_invitation_email(
            to_email=data.email,
            invited_by_name=inviter_name,
            organization=data.organization,
            role=data.role,
            register_url=register_url,
            settings=settings,
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Invitation email non envoyé → {data.email}: {exc}")

    return member


@router.patch("/team-members/{member_id}", response_model=TeamMemberOut)
async def update_team_member(
    member_id: uuid.UUID,
    data: TeamMemberUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(TeamMember).where(TeamMember.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, detail="Membre d'equipe introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(member, field, value)
    return member


@router.delete("/team-members/{member_id}", status_code=204)
async def delete_team_member(
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(TeamMember).where(TeamMember.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(404, detail="Membre d'equipe introuvable")
    await db.delete(member)


@router.get("/quality-checks", response_model=list[QualityCheckOut])
async def list_quality_checks(
    dataset_slug: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(QualityCheck)
    if dataset_slug:
        query = query.where(QualityCheck.dataset_slug == dataset_slug)
    result = await db.execute(query.order_by(QualityCheck.created_at.desc()).limit(50))
    checks = result.scalars().all()
    return [await _quality_check_out(db, check) for check in checks]


@router.post("/quality-checks", response_model=QualityCheckOut, status_code=201)
async def create_quality_check(
    data: QualityCheckCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_institutional),
):
    issues_data = data.issues
    check_data = data.model_dump(exclude={"issues"})
    check = QualityCheck(**check_data, reviewer_id=current_user.id)
    db.add(check)
    await db.flush()
    for issue_data in issues_data:
        db.add(QualityIssue(**issue_data.model_dump(), check_id=check.id))
    await db.flush()
    return await _quality_check_out(db, check)


@router.get("/quality-checks/{check_id}", response_model=QualityCheckOut)
async def get_quality_check(check_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QualityCheck).where(QualityCheck.id == check_id))
    check = result.scalar_one_or_none()
    if not check:
        raise HTTPException(404, detail="Controle qualite introuvable")
    return await _quality_check_out(db, check)


@router.patch("/quality-checks/{check_id}", response_model=QualityCheckOut)
async def update_quality_check(
    check_id: uuid.UUID,
    data: QualityCheckUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(QualityCheck).where(QualityCheck.id == check_id))
    check = result.scalar_one_or_none()
    if not check:
        raise HTTPException(404, detail="Controle qualite introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(check, field, value)
    return await _quality_check_out(db, check)


@router.post("/quality-checks/{check_id}/publish", response_model=QualityCheckOut)
async def publish_quality_check(
    check_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(QualityCheck).where(QualityCheck.id == check_id))
    check = result.scalar_one_or_none()
    if not check:
        raise HTTPException(404, detail="Controle qualite introuvable")

    unresolved_result = await db.execute(
        select(func.count(QualityIssue.id)).where(
            QualityIssue.check_id == check.id,
            QualityIssue.is_resolved.is_(False),
        )
    )
    if unresolved_result.scalar_one():
        raise HTTPException(409, detail="Des anomalies qualite restent a traiter")

    now = datetime.now(timezone.utc)
    check.status = QualityCheckStatus.completed
    check.finished_at = now

    dataset_result = None
    if check.dataset_id:
        dataset_result = await db.execute(select(Dataset).where(Dataset.id == check.dataset_id))
    elif check.dataset_slug:
        dataset_result = await db.execute(select(Dataset).where(Dataset.slug == check.dataset_slug))
    if dataset_result:
        dataset = dataset_result.scalar_one_or_none()
        if dataset:
            dataset.status = DatasetStatus.published
            dataset.published_at = dataset.published_at or now

    return await _quality_check_out(db, check)


@router.patch("/quality-issues/{issue_id}/resolve", response_model=QualityIssueOut)
async def resolve_quality_issue(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(QualityIssue).where(QualityIssue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(404, detail="Probleme qualite introuvable")
    issue.is_resolved = True
    return issue


@router.patch("/quality-issues/{issue_id}/apply-suggestion", response_model=QualityIssueOut)
async def apply_quality_issue_suggestion(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(QualityIssue).where(QualityIssue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(404, detail="Probleme qualite introuvable")
    if not issue.suggestion:
        raise HTTPException(422, detail="Aucune suggestion disponible pour cette anomalie")
    issue.raw_value = issue.suggestion
    issue.is_resolved = True
    return issue


@router.patch("/quality-issues/{issue_id}/correct", response_model=QualityIssueOut)
async def correct_quality_issue(
    issue_id: uuid.UUID,
    data: QualityIssueCorrection,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_institutional),
):
    result = await db.execute(select(QualityIssue).where(QualityIssue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(404, detail="Probleme qualite introuvable")
    if data.corrected_value:
        issue.raw_value = data.corrected_value
        issue.suggestion = data.corrected_value
    elif data.note:
        issue.suggestion = data.note
    issue.is_resolved = True
    return issue
