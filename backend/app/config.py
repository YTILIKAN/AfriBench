"""Configuration du service backend AfriBench."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ → repo root
REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AFRIBENCH_",
        env_file=str(REPO_ROOT / ".env"),
        extra="ignore",
    )

    app_name: str = "AfriBench API"
    api_prefix: str = "/api/v1"
    # "*" = ouvert (prototype). En prod : liste d'origines séparées par des virgules.
    cors_origins: str = "*"

    # Clé pour POST /evaluate et /reload (vide = écriture désactivée)
    api_key: str = ""

    # Base de données PostgreSQL (vide = désactivée, fallback fichiers JSON)
    database_url: str = ""
    # Mot de passe du backoffice (vide = login désactivé)
    admin_password: str = ""
    # Clé Fernet (base64) pour chiffrer les clés API en base (vide = stockage en clair)
    encryption_key: str = ""
    # Durée de vie d'une session backoffice (secondes)
    admin_session_ttl: int = 60 * 60 * 12

    # Rate limits (fenêtre glissante, par IP+path)
    rate_limit_read: int = 120
    rate_limit_read_window: float = 60.0
    rate_limit_write: int = 10
    rate_limit_write_window: float = 60.0
    # auto | memory | postgres | redis
    rate_limit_backend: str = "auto"
    # Redis optionnel (prioritaire sur Postgres pour le rate-limit si défini)
    redis_url: str = ""

    # Source of truth for benchmark data
    data_dir: Path = REPO_ROOT / "data"
    questions_dir: Path = REPO_ROOT / "data" / "questions" / "v1" / "validated"
    questions_witness_dir: Path = REPO_ROOT / "data" / "questions" / "v1" / "witness"
    results_dir: Path = REPO_ROOT / "data" / "results"
    results_fallback: Path = REPO_ROOT / "frontend" / "data" / "results.json"

    host: str = "0.0.0.0"
    port: int = 8080

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def db_enabled(self) -> bool:
        return bool(self.database_url.strip())

    @property
    def admin_enabled(self) -> bool:
        return bool(self.admin_password.strip())

    @property
    def redis_enabled(self) -> bool:
        return bool(self.redis_url.strip())

    @property
    def sqlalchemy_database_url(self) -> str:
        """Railway fournit postgresql:// → SQLAlchemy + psycopg attend postgresql+psycopg://."""
        url = self.database_url.strip()
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
