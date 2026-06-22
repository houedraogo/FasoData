import io
import uuid
from datetime import datetime, timezone
from html import escape

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.alerts.email_service import _send
from fasodata.auth.deps import get_current_active_user, require_admin
from fasodata.core.config import get_settings
from fasodata.core.database import get_db
from fasodata.core.security import hash_password
from fasodata.users.models import AccessRequest, AccessRequestStatus, User
from fasodata.users.schemas import (
    AccessRequestListOut,
    AccessRequestOut,
    AccessRequestReview,
    UserAdminUpdate,
    UserOut,
    UserOutList,
    UserUpdate,
)

settings = get_settings()
router = APIRouter(prefix="/api/users", tags=["users"])

# Taille max avatar : 5 Mo
MAX_AVATAR_SIZE = 5 * 1024 * 1024
ALLOWED_TYPES   = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.get("", response_model=UserOutList)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(User)
    if q:
        query = query.where(
            User.email.ilike(f"%{q}%") | User.full_name.ilike(f"%{q}%")
        )

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return UserOutList(items=items, total=total, page=page, page_size=page_size)


@router.get("/access-requests", response_model=AccessRequestListOut)
async def list_access_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: AccessRequestStatus | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(AccessRequest)
    if status:
        query = query.where(AccessRequest.status == status)
    if q:
        query = query.where(
            AccessRequest.email.ilike(f"%{q}%")
            | AccessRequest.full_name.ilike(f"%{q}%")
            | AccessRequest.organization.ilike(f"%{q}%")
        )

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()
    result = await db.execute(
        query.order_by(AccessRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return AccessRequestListOut(
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/access-requests/{request_id}/approve", response_model=UserOut)
async def approve_access_request(
    request_id: uuid.UUID,
    data: AccessRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == request_id))
    request = result.scalar_one_or_none()
    if not request:
        raise HTTPException(404, detail="Demande d'accès introuvable")
    if request.status == AccessRequestStatus.approved and request.created_user_id:
        user_result = await db.execute(select(User).where(User.id == request.created_user_id))
        user = user_result.scalar_one_or_none()
        if user:
            return user

    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Un utilisateur existe déjà avec cet email")
    if not request.hashed_password:
        raise HTTPException(status_code=422, detail="Mot de passe manquant pour créer le compte")

    user = User(
        email=request.email,
        hashed_password=request.hashed_password,
        full_name=request.full_name,
        organization=request.organization,
        role=request.role,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    request.status = AccessRequestStatus.approved
    request.reviewed_by_id = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.review_note = data.note
    request.created_user_id = user.id

    app_base_url = settings.public_app_base_url
    display_name = escape(request.full_name or request.email)
    organization = escape(request.organization)
    email = escape(request.email)
    review_note_html = ""
    if data.note:
        review_note = escape(data.note)
        review_note_html = (
            '<p style="color:#374151;font-size:13px;margin:12px 0 0">'
            f"<em>Note de l'equipe : {review_note}</em>"
            "</p>"
        )

    _send(
        to_email=request.email,
        subject="✅ Votre accès FasoData a été approuvé",
        body_html=f"""
          <h2 style="color:#1A2C42;margin:0 0 12px">Bienvenue sur FasoData, {display_name} !</h2>
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px">
            Votre demande d'accès pour <strong>{organization}</strong> a été approuvée.
            Vous pouvez maintenant vous connecter à votre espace institutionnel.
          </p>
          <a href="{app_base_url}/auth/connexion"
             style="display:inline-block;background:#1A2C42;color:#fff;padding:12px 24px;
                    border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:24px">
            Se connecter à FasoData →
          </a>
          <p style="color:#6b7280;font-size:13px;margin:0">
            Email : <strong>{email}</strong><br>
            Utilisez le mot de passe que vous avez défini lors de votre inscription.
          </p>
          {review_note_html}
        """,
        unsubscribe_url=f"{app_base_url}/",
        settings=settings,
    )

    return user


@router.post("/access-requests/{request_id}/reject", response_model=AccessRequestOut)
async def reject_access_request(
    request_id: uuid.UUID,
    data: AccessRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == request_id))
    request = result.scalar_one_or_none()
    if not request:
        raise HTTPException(404, detail="Demande d'accès introuvable")
    request.status = AccessRequestStatus.rejected
    request.reviewed_by_id = current_user.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.review_note = data.note
    request.created_user_id = None

    app_base_url = settings.public_app_base_url
    display_name = escape(request.full_name or request.email)
    organization = escape(request.organization)
    rejection_note_html = ""
    if data.note:
        rejection_note = escape(data.note)
        rejection_note_html = (
            '<div style="background:#fef3c7;border-left:4px solid #f59e0b;'
            'border-radius:8px;padding:12px 16px;margin-bottom:20px">'
            '<p style="margin:0;color:#92400e;font-size:13px">'
            f"<strong>Motif :</strong> {rejection_note}"
            "</p></div>"
        )

    _send(
        to_email=request.email,
        subject="Votre demande d'accès FasoData",
        body_html=f"""
          <h2 style="color:#1A2C42;margin:0 0 12px">Demande d'accès FasoData</h2>
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px">
            Bonjour {display_name},<br><br>
            Nous avons examiné votre demande d'accès pour <strong>{organization}</strong>
            et nous ne sommes pas en mesure de la valider pour le moment.
          </p>
          {rejection_note_html}
          <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px">
            Si vous pensez qu'il s'agit d'une erreur ou souhaitez plus d'informations,
            contactez-nous à <a href="mailto:contact@fasodata.com" style="color:#E04E2F">contact@fasodata.com</a>.
          </p>
          <p style="color:#6b7280;font-size:12px;margin:0">L'équipe FasoData</p>
        """,
        unsubscribe_url=f"{app_base_url}/",
        settings=settings,
    )

    return request


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload d'une photo de profil — stockée dans MinIO."""
    # Vérifications
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, f"Type de fichier non supporté : {file.content_type}")

    content = await file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(413, "Image trop grande (max 5 Mo)")

    # Clé MinIO : avatars/<user_id>.<ext>
    ext      = (file.filename or "avatar.jpg").rsplit(".", 1)[-1].lower()
    s3_key   = f"avatars/{current_user.id}.{ext}"

    try:
        from minio import Minio
        client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        # Créer le bucket si inexistant
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)

        client.put_object(
            settings.minio_bucket, s3_key,
            io.BytesIO(content), len(content),
            content_type=file.content_type or "image/jpeg",
        )

        # URL publique (interne Docker ou externe selon le déploiement)
        avatar_url = f"/api/users/me/avatar/{current_user.id}.{ext}?t={int(datetime.now(timezone.utc).timestamp())}"
        current_user.avatar_url = avatar_url

    except Exception as e:
        raise HTTPException(500, f"Erreur MinIO : {e}")

    return current_user


@router.get("/me/avatar/{filename}")
async def serve_avatar(filename: str):
    """
    Sert l'avatar directement depuis MinIO — pas d'auth requise.
    Les balises <img src="..."> du navigateur ne peuvent pas envoyer de JWT,
    donc cet endpoint est public (sécurité par obscurité : UUID non devinable).
    """
    from minio import Minio

    # Sécurité minimale — bloquer traversée de chemin
    safe_filename = filename.replace("..", "").replace("/", "").replace("\\", "")
    s3_key = f"avatars/{safe_filename}"

    MEDIA_TYPES = {
        "jpg":  "image/jpeg", "jpeg": "image/jpeg",
        "png":  "image/png",  "webp": "image/webp",
        "gif":  "image/gif",
    }
    ext        = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else "png"
    media_type = MEDIA_TYPES.get(ext, "image/png")

    try:
        client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        # Lire depuis MinIO et streamer directement au navigateur
        response = client.get_object(settings.minio_bucket, s3_key)
        content  = response.read()
        response.close()
        response.release_conn()

        from fastapi.responses import Response as FastResponse
        return FastResponse(
            content=content,
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache 1h côté navigateur
                "Content-Length": str(len(content)),
            },
        )
    except Exception:
        raise HTTPException(404, "Avatar introuvable")


@router.get("/me/submissions")
async def my_submissions(
    page:      int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Historique des relevés de prix soumis par l'utilisateur courant.
    Cherche par : reporter = email OU reporter = user_id (terrain web).
    """
    from fasodata.prices.models import PriceData

    q = (
        select(PriceData)
        .where(
            or_(
                PriceData.reporter == current_user.email,
                PriceData.reporter == str(current_user.id),
                PriceData.reporter.ilike(f"%{current_user.email}%"),
            ),
            PriceData.source.in_(["sms", "whatsapp", "manual"]),
        )
        .order_by(PriceData.created_at.desc())
    )

    total_r = await db.execute(select(func.count()).select_from(q.subquery()))
    total   = total_r.scalar_one()

    q = q.offset((page - 1) * page_size).limit(page_size)
    result  = await db.execute(q)

    from fasodata.prices.schemas import PriceDataOut
    items = [PriceDataOut.model_validate(r) for r in result.scalars().all()]

    # Stats globales
    stats_q = select(
        func.count(PriceData.id).label("total"),
        func.avg(PriceData.price).label("avg_price"),
        func.count(PriceData.commodity.distinct()).label("commodities"),
    ).where(
        or_(
            PriceData.reporter == current_user.email,
            PriceData.reporter == str(current_user.id),
        )
    )
    stats_r = await db.execute(stats_q)
    row     = stats_r.one()

    return {
        "items":       items,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "stats": {
            "total_submissions": row.total or 0,
            "avg_price":         round(row.avg_price or 0, 1),
            "commodities_count": row.commodities or 0,
        },
    }


@router.patch("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    for field, value in data.model_dump(exclude_none=True).items():
        if field == "password":
            current_user.hashed_password = hash_password(value)
        else:
            setattr(current_user, field, value)
    return current_user


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="Utilisateur introuvable")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def admin_update_user(
    user_id: uuid.UUID,
    data: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="Utilisateur introuvable")

    for field, value in data.model_dump(exclude_none=True).items():
        if field == "password":
            user.hashed_password = hash_password(value)
        else:
            setattr(user, field, value)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="Utilisateur introuvable")
    await db.delete(user)
