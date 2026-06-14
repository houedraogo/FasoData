from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Base
    project_name: str = "FasoData"
    environment: str = "development"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://fasodata:changeme@db:5432/fasodata"

    # Redis / Celery
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_public_url: str = ""  # URL publique pour les URLs signées (ex: https://fasodata.bf/storage)
    minio_access_key: str = "fasodata"
    minio_secret_key: str = "changeme_minio"
    minio_bucket: str = "fasodata-uploads"
    minio_secure: bool = False

    # Meilisearch
    meilisearch_url: str = "http://meilisearch:7700"
    meilisearch_api_key: str = "changeme_meili"

    # Public URLs
    next_public_api_url: str = "http://localhost/api"

    # Auth
    secret_key: str = "changeme_secret_key_at_least_32_chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""

    # CORS
    cors_origins: str = "http://localhost,http://localhost:3000"

    # Admin
    first_admin_email: str = "admin@fasodata.bf"
    first_admin_password: str = "changeme_admin"

    # ── App ──────────────────────────────────────────────────────────────────
    app_base_url: str = ""   # URL publique (HTTPS en prod), ex: https://fasodata.bf

    @property
    def public_app_base_url(self) -> str:
        if self.app_base_url:
            return self.app_base_url.rstrip("/")
        if self.next_public_api_url.endswith("/api"):
            return self.next_public_api_url[:-4].rstrip("/")
        return self.next_public_api_url.rstrip("/")

    # ── SMTP — Envoi d'emails alertes prix ───────────────────────────────────
    # Laisser vide pour le mode simulation (emails loggués, pas envoyés)
    smtp_host:     str = ""
    smtp_port:     int = 587
    smtp_user:     str = ""
    smtp_password: str = ""
    emails_from:   str = "noreply@fasodata.bf"

    # Africa's Talking — SMS collecte prix terrain
    # Mode sandbox gratuit : username="sandbox", api_key=<clé sandbox AT>
    # Production        : username=<votre shortcode>, api_key=<clé prod>
    at_username: str = "sandbox"
    at_api_key:  str = ""        # Obtenir sur https://account.africastalking.com
    at_shortcode: str = ""       # Numéro émetteur (ex: +22601234567 ou shortcode)
    at_sandbox: bool = True      # True = sandbox gratuit, False = production

    # WFP DataBridges - prix alimentaires
    wfp_api_base_url: str = "https://gateway.api.wfp.org/vam-data-bridges/v2"
    wfp_token_url: str = "https://api.wfp.org/token"
    wfp_api_client_id: str = ""
    wfp_api_client_secret: str = ""
    wfp_country_code: str = "BFA"
    wfp_prices_lookback_days: int = 45
    wfp_prices_page_size: int = 1000
    wfp_prices_timeout_seconds: int = 30
    wfp_public_prices_url: str = (
        "https://data.humdata.org/dataset/bfd82e1f-0296-48a8-ac28-c11e028be5ed/"
        "resource/0eca67d6-e297-4f5e-9132-7dc42891b749/download/"
        "wfp_food_prices_bfa.csv"
    )

    # WhatsApp Cloud API - alertes prix
    whatsapp_graph_api_url: str = "https://graph.facebook.com/v25.0"
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_enabled: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
