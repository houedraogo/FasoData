from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from fasodata.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire, "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as e:
        raise ValueError(f"Token invalide: {e}") from e


# ── Reset mot de passe ────────────────────────────────────────────────────────

RESET_TOKEN_EXPIRE_MINUTES = 30


def create_reset_token(user_id: str) -> str:
    """Génère un JWT à usage unique valable 30 minutes pour la réinitialisation."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "type": "reset"}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_reset_token(token: str) -> str:
    """Décode le token reset et retourne l'user_id, lève ValueError si invalide/expiré."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as e:
        raise ValueError(f"Token expiré ou invalide : {e}") from e
    if payload.get("type") != "reset":
        raise ValueError("Type de token incorrect")
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Token malformé")
    return user_id
