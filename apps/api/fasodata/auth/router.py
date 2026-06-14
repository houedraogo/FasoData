import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fasodata.auth.deps import get_current_active_user
from fasodata.core.config import get_settings
from fasodata.core.database import get_db
from fasodata.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_reset_token,
    decode_token,
    hash_password,
    verify_password,
)
from fasodata.users.models import User
from fasodata.users.schemas import UserCreate, UserOut

logger   = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email déjà utilisé")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        organization=data.organization,
        role=data.role,
    )
    db.add(user)
    await db.flush()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Compte désactivé")

    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role}),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Type de token incorrect")
        user_id = payload.get("sub")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role}),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_active_user)):
    return current_user


# ── Réinitialisation mot de passe ──────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


# ── Google SSO ────────────────────────────────────────────────────────────────

class GoogleTokenRequest(BaseModel):
    credential: str  # JWT signé par Google (id_token)


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Vérifie le credential Google (id_token) via l'API tokeninfo de Google,
    puis crée ou connecte l'utilisateur correspondant.
    """
    import httpx

    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google SSO non configuré sur ce serveur.")

    # ── Vérification du token auprès de Google ────────────────────────────────
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": data.credential},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token Google invalide.")

    info = resp.json()

    # Vérifier que le token a bien été émis pour notre application
    if info.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=401, detail="Token Google non destiné à cette application.")

    email     = info.get("email", "").lower().strip()
    full_name = info.get("name") or info.get("email", "").split("@")[0]

    if not email:
        raise HTTPException(status_code=400, detail="Email non fourni par Google.")

    # ── Recherche ou création de l'utilisateur ────────────────────────────────
    result = await db.execute(select(User).where(User.email == email))
    user   = result.scalar_one_or_none()

    is_new = False
    if user:
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Compte désactivé.")
    else:
        import secrets
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=full_name,
            role="public",
            is_active=True,
        )
        db.add(user)
        await db.flush()
        is_new = True
        logger.info(f"Nouvel utilisateur via Google SSO : {email}")

    return TokenResponse(
        access_token=create_access_token(str(user.id), {"role": user.role}),
        refresh_token=create_refresh_token(str(user.id)),
        is_new=is_new,
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Envoie un lien de réinitialisation à l'email fourni.
    Retourne toujours 200 pour éviter l'énumération d'emails (sécurité).
    """
    # Message générique — identique qu'un compte existe ou non
    generic_msg = "Si un compte correspond à cet email, un lien de réinitialisation a été envoyé."

    result = await db.execute(select(User).where(User.email == data.email))
    user   = result.scalar_one_or_none()

    if user and user.is_active:
        token     = create_reset_token(str(user.id))
        reset_url = f"{settings.public_app_base_url}/auth/reinitialiser-mot-de-passe?token={token}"

        try:
            from fasodata.alerts.email_service import send_password_reset_email
            send_password_reset_email(user.email, reset_url, settings)
        except Exception as exc:
            logger.error(f"Erreur envoi email reset → {user.email}: {exc}")
            # On ne lève pas d'erreur côté client (message générique conservé)
    else:
        logger.info(f"Demande reset pour email inconnu/inactif : {data.email}")

    return MessageResponse(message=generic_msg)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Réinitialise le mot de passe via le token reçu par email.
    Le token est valable 30 minutes et contient l'user_id (JWT signé).
    """
    try:
        user_id = decode_reset_token(data.token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lien invalide ou expiré. Refaites une demande de réinitialisation. ({exc})",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compte introuvable ou désactivé.",
        )

    user.hashed_password = hash_password(data.new_password)
    logger.info(f"Mot de passe réinitialisé → {user.email}")

    return MessageResponse(message="Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.")
