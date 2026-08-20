"""Moteur SQLAlchemy + session + migrations Alembic."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger("afribench")

_engine: Engine | None = None
_session_factory: sessionmaker | None = None


class Base(DeclarativeBase):
    """Base déclarative partagée par tous les modèles."""


def _build() -> tuple[Engine, sessionmaker]:
    global _engine, _session_factory
    if _engine is None:
        url = get_settings().sqlalchemy_database_url
        _engine = create_engine(url, pool_pre_ping=True, future=True)
        _session_factory = sessionmaker(
            bind=_engine, autoflush=False, expire_on_commit=False, future=True
        )
    return _engine, _session_factory


def run_migrations() -> None:
    """Applique les migrations Alembic jusqu'à head."""
    from alembic import command
    from alembic.config import Config

    ini_path = Path(__file__).resolve().parent / "alembic.ini"
    cfg = Config(str(ini_path))
    cfg.set_main_option("sqlalchemy.url", get_settings().sqlalchemy_database_url)
    command.upgrade(cfg, "head")
    logger.info("Migrations Alembic appliquées (head)")


def init_db() -> None:
    """Initialise le schéma via Alembic (remplace create_all)."""
    run_migrations()


def get_session() -> Session:
    """Ouvre une session (l'appelant est responsable de la fermeture)."""
    _, factory = _build()
    return factory()


def get_db() -> Iterator[Session]:
    """Dépendance FastAPI : session par requête, fermée en fin de requête."""
    session = get_session()
    try:
        yield session
    finally:
        session.close()
