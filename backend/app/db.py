"""Moteur SQLAlchemy + session + base déclarative."""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

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


def init_db() -> None:
    """Crée les tables (idempotent). Appelé au démarrage si la DB est activée."""
    from app import models  # noqa: F401  (enregistre les modèles sur Base.metadata)

    engine, _ = _build()
    Base.metadata.create_all(bind=engine)


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
