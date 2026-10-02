"""Configuración de SQLAlchemy: motor, sesión y base declarativa."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM."""


engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """Dependencia de FastAPI que provee una sesión de base de datos por petición."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Crea las tablas que aún no existan (desarrollo; en producción se usará Alembic)."""
    # Importar los modelos para que queden registrados en el metadata de Base
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
