import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.auth.deps import get_current_active_user, require_admin
from fasodata.core.config import get_settings
from fasodata.core.database import get_db
from fasodata.core.security import hash_password
from fasodata.users.models import User
from fasodata.users.schemas import UserAdminUpdate, UserOut, UserOutList, UserUpdate

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
