"""Configuration du service backend AfriBench."""

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

    # Rate limits (fenêtre glissante, par IP+path)
    rate_limit_read: int = 120
    rate_limit_read_window: float = 60.0
    rate_limit_write: int = 10
    rate_limit_write_window: float = 60.0

    # Source of truth for benchmark data
    data_dir: Path = REPO_ROOT / "data"
    questions_dir: Path = REPO_ROOT / "data" / "questions" / "v1" / "validated"
    results_dir: Path = REPO_ROOT / "data" / "results"
    # Fallback when data/results is empty (legacy static export)
    results_fallback: Path = REPO_ROOT / "frontend" / "data" / "results.json"

    host: str = "0.0.0.0"
    port: int = 8080

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
