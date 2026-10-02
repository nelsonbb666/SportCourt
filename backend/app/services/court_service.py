"""Servicio de canchas: CRUD y catálogo de deportes."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.court import Court, SportType
from app.schemas.court import CourtCreate, CourtUpdate

DEFAULT_SPORTS = ["Fútbol", "Baloncesto", "Voleibol", "Tenis", "Microfútbol", "Béisbol"]


class CourtAlreadyExistsError(Exception):
    """Ya existe una cancha con el mismo nombre para el mismo deporte."""


class SportNotFoundError(Exception):
    """El deporte indicado no existe."""


def ensure_default_sports(db: Session) -> None:
    """Garantiza que existan los deportes base del sistema (idempotente)."""
    existing = set(db.scalars(select(SportType.name)).all())
    for name in DEFAULT_SPORTS:
        if name not in existing:
            db.add(SportType(name=name))
    db.commit()


def list_sports(db: Session) -> list[SportType]:
    return list(db.scalars(select(SportType).order_by(SportType.name)))


def get_court(db: Session, court_id: int) -> Court | None:
    return db.get(Court, court_id)


def list_courts(
    db: Session,
    *,
    sport_id: int | None = None,
    only_available: bool = False,
    search: str | None = None,
) -> list[Court]:
    stmt = select(Court).order_by(Court.name)
    if sport_id is not None:
        stmt = stmt.where(Court.sport_id == sport_id)
    if only_available:
        stmt = stmt.where(Court.is_available.is_(True))
    if search:
        stmt = stmt.where(Court.name.ilike(f"%{search}%"))
    return list(db.scalars(stmt))


def create_court(db: Session, payload: CourtCreate) -> Court:
    sport = db.get(SportType, payload.sport_id)
    if sport is None:
        raise SportNotFoundError()
    duplicate = db.scalar(
        select(Court).where(Court.name == payload.name, Court.sport_id == payload.sport_id)
    )
    if duplicate is not None:
        raise CourtAlreadyExistsError()
    court = Court(**payload.model_dump())
    db.add(court)
    db.commit()
    db.refresh(court)
    return court


def update_court(db: Session, court: Court, payload: CourtUpdate) -> Court:
    data = payload.model_dump(exclude_unset=True)
    if "sport_id" in data and db.get(SportType, data["sport_id"]) is None:
        raise SportNotFoundError()
    for key, value in data.items():
        setattr(court, key, value)
    db.commit()
    db.refresh(court)
    return court


def delete_court(db: Session, court: Court) -> None:
    db.delete(court)
    db.commit()
