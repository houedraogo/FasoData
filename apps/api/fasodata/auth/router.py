import logging
import secrets
from datetime import datetime, timezone

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
from fasodata.dashboard.models import TeamMember, TeamMemberStatus
from fasodata.users.models import AccessRequest, AccessRequestStatus, User
from fasodata.users.schemas import AccessRequestOut, UserCreate, UserOut

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


@router.post("/register", response_model=AccessRequestOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    if data.role != "institutional":
        raise HTTPException(
            status_code=403,
            detail="La crÃ©ation de compte public est dÃ©sactivÃ©e. Les donnÃ©es publiques sont accessibles sans compte.",
        )
    if not data.organization or len(data.organization.strip()) < 2:
        raise HTTPException(status_code=422, detail="Nom de l'organisation requis")

    email = data.email.lower().strip()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email dÃ©jÃ  utilisÃ©")

    invited_result = await db.execute(select(TeamMember).where(TeamMember.email == email))
    invited_member = invited_result.scalar_one_or_none()
    if invited_member and invited_member.status in (TeamMemberStatus.invited, TeamMemberStatus.active):
        user = User(
            email=email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name or invited_member.full_name,
            organization=invited_member.organization,
            role=data.role,
        )
        db.add(user)
        await db.flush()
        invited_member.user_id = user.id
        invited_member.status = TeamMemberStatus.active
        invited_member.joined_at = datetime.now(timezone.utc)
        request = AccessRequest(
            email=email,
            hashed_password=user.hashed_password,
            full_name=user.full_name,
            organization=user.organization or data.organization,
            role=data.role,
            status=AccessRequestStatus.approved,
            reviewed_at=datetime.now(timezone.utc),
            review_note="Approbation automatique via invitation d'Ã©quipe.",
            created_user_id=user.id,
        )
        db.add(request)
        await db.flush()
        return request

    request_result = await db.execute(select(AccessRequest).where(AccessRequest.email == email))
    request = request_result.scalar_one_or_none()
    if request:
        if request.status == AccessRequestStatus.pending:
            raise HTTPException(status_code=409, detail="Une demande d'accÃ¨s est dÃ©jÃ  en attente pour cette adresse.")
        if request.status == AccessRequestStatus.approved:
            raise HTTPException(status_code=409, detail="Cette demande a dÃ©jÃ  Ã©tÃ© approuvÃ©e. Connectez-vous.")
        request.status = AccessRequestStatus.pending
        request.hashed_password = hash_password(data.password)
        request.full_name = data.full_name
        request.organization = data.organization
        request.role = data.role
        request.reviewed_by_id = None
        request.reviewed_at = None
        request.review_note = None
        request.created_user_id = None
    else:
        request = AccessRequest(
            email=email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            organization=data.organization,
            role=data.role,
        )
        db.add(request)
    await db.flush()
    return request


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
        raise HTTPException(status_code=400, detail="Compte dÃ©sactivÃ©")

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


# â”€â”€ RÃ©initialisation mot de passe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


# â”€â”€ Google SSO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class GoogleTokenRequest(BaseModel):
    credential: str  # JWT signÃ© par Google (id_token)


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    VÃ©rifie le credential Google (id_token) via l'API tokeninfo de Google,
    puis crÃ©e ou connecte l'utilisateur correspondant.
    """
    import httpx

    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google SSO non configurÃ© sur ce serveur.")

    # â”€â”€ VÃ©rification du token auprÃ¨s de Google â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": data.credential},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token Google invalide.")

    info = resp.json()

    # VÃ©rifier que le token a bien Ã©tÃ© Ã©mis pour notre application
    if info.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=401, detail="Token Google non destinÃ© Ã  cette application.")

    email     = info.get("email", "").lower().strip()
    full_name = info.get("name") or info.get("email", "").split("@")[0]

    if not email:
        raise HTTPException(status_code=400, detail="Email non fourni par Google.")

    # â”€â”€ Recherche ou crÃ©ation de l'utilisateur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    result = await db.execute(select(User).where(User.email == email))
    user   = result.scalar_one_or_none()

    is_new = False
    if user:
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Compte dÃ©sactivÃ©.")
    else:
        invited_result = await db.execute(select(TeamMember).where(TeamMember.email == email))
        invited_member = invited_result.scalar_one_or_none()
        if invited_member and invited_member.status in (TeamMemberStatus.invited, TeamMemberStatus.active):
            user = User(
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                full_name=full_name or invited_member.full_name,
                organization=invited_member.organization,
                role="institutional",
                is_active=True,
            )
            db.add(user)
            await db.flush()
            invited_member.user_id = user.id
            invited_member.status = TeamMemberStatus.active
            invited_member.joined_at = datetime.now(timezone.utc)
            return TokenResponse(
                access_token=create_access_token(str(user.id), {"role": user.role}),
                refresh_token=create_refresh_token(str(user.id)),
                is_new=True,
            )

        request_result = await db.execute(select(AccessRequest).where(AccessRequest.email == email))
        request = request_result.scalar_one_or_none()
        if request and request.status == AccessRequestStatus.pending:
            raise HTTPException(status_code=403, detail="Votre demande d acces est en attente de validation admin.")
        if request and request.status == AccessRequestStatus.rejected:
            raise HTTPException(status_code=403, detail="Votre demande d acces a ete refusee.")
        if request and request.status == AccessRequestStatus.approved:
            user = User(
                email=email,
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                full_name=full_name or request.full_name,
                organization=request.organization,
                role=request.role,
                is_active=True,
            )
            db.add(user)
            await db.flush()
            request.created_user_id = user.id
            return TokenResponse(
                access_token=create_access_token(str(user.id), {"role": user.role}),
                refresh_token=create_refresh_token(str(user.id)),
                is_new=True,
            )

        raise HTTPException(
            status_code=403,
            detail="Votre adresse n est pas encore rattachee a une organisation FasoData. Demandez un acces contributeur.",
        )

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
    Envoie un lien de rÃ©initialisation Ã  l'email fourni.
    Retourne toujours 200 pour Ã©viter l'Ã©numÃ©ration d'emails (sÃ©curitÃ©).
    """
    # Message gÃ©nÃ©rique â€” identique qu'un compte existe ou non
    generic_msg = "Si un compte correspond Ã  cet email, un lien de rÃ©initialisation a Ã©tÃ© envoyÃ©."

    result = await db.execute(select(User).where(User.email == data.email))
    user   = result.scalar_one_or_none()

    if user and user.is_active:
        token     = create_reset_token(str(user.id))
        reset_url = f"{settings.public_app_base_url}/auth/reinitialiser-mot-de-passe?token={token}"

        try:
            from fasodata.alerts.email_service import send_password_reset_email
            send_password_reset_email(user.email, reset_url, settings)
        except Exception as exc:
            logger.error(f"Erreur envoi email reset â†’ {user.email}: {exc}")
            # On ne lÃ¨ve pas d'erreur cÃ´tÃ© client (message gÃ©nÃ©rique conservÃ©)
    else:
        logger.info(f"Demande reset pour email inconnu/inactif : {data.email}")

    return MessageResponse(message=generic_msg)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    RÃ©initialise le mot de passe via le token reÃ§u par email.
    Le token est valable 30 minutes et contient l'user_id (JWT signÃ©).
    """
    try:
        user_id = decode_reset_token(data.token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lien invalide ou expirÃ©. Refaites une demande de rÃ©initialisation. ({exc})",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compte introuvable ou dÃ©sactivÃ©.",
        )

    user.hashed_password = hash_password(data.new_password)
    logger.info(f"Mot de passe rÃ©initialisÃ© â†’ {user.email}")

    return MessageResponse(message="Mot de passe rÃ©initialisÃ© avec succÃ¨s. Vous pouvez maintenant vous connecter.")
