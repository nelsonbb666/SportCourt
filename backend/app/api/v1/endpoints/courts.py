"""Endpoints de canchas: catálogo público + administración."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.court import Court
from app.models.user import User
from app.schemas.court import CourtCreate, CourtOut, CourtUpdate, SportOut
from app.services import court_service
from app.services.court_service import CourtAlreadyExistsError, SportNotFoundError

router = APIRouter(prefix="/courts", tags=["canchas"])


@router.get("/sports", response_model=list[SportOut], summary="Listar deportes")
def list_sports(db: Session = Depends(get_db)) -> list:
    return court_service.list_sports(db)


@router.get("/{court_id}/availability", summary="Disponibilidad de una cancha por día")
def get_availability(court_id: int, day: date, db: Session = Depends(get_db)) -> dict:
    """Franjas horarias (bloques de 1 hora) libres/ocupadas de la cancha en el día dado."""
    from app.services import reservation_service
    from app.services.reservation_service import CourtNotAvailableError

    try:
        slots = reservation_service.available_slots(db, court_id, day)
    except CourtNotAvailableError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La cancha no existe") from None
    return {"court_id": court_id, "date": day.isoformat(), "slots": slots}


@router.get("", response_model=list[CourtOut], summary="Listar canchas")
def list_courts(
    sport_id: int | None = None,
    only_available: bool = False,
    search: str | None = None,
    db: Session = Depends(get_db),
) -> list[Court]:
    """Catálogo de canchas con filtros opcionales por deporte, disponibilidad y nombre."""
    return court_service.list_courts(
        db, sport_id=sport_id, only_available=only_available, search=search
    )


@router.get("/{court_id}", response_model=CourtOut, summary="Detalle de cancha")
def get_court(court_id: int, db: Session = Depends(get_db)) -> Court:
    court = court_service.get_court(db, court_id)
    if court is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La cancha no existe")
    return court


def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede gestionar canchas",
        )


@router.post("", response_model=CourtOut, status_code=status.HTTP_201_CREATED,
             summary="Crear cancha (admin)")
def create_court(payload: CourtCreate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> Court:
    _require_admin(user)
    try:
        return court_service.create_court(db, payload)
    except SportNotFoundError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="El deporte indicado no existe") from None
    except CourtAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            detail="Ya existe una cancha con ese nombre para ese deporte") from None


@router.put("/{court_id}", response_model=CourtOut, summary="Actualizar cancha (admin)")
def update_court(court_id: int, payload: CourtUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> Court:
    _require_admin(user)
    court = court_service.get_court(db, court_id)
    if court is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La cancha no existe")
    try:
        return court_service.update_court(db, court, payload)
    except SportNotFoundError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="El deporte indicado no existe") from None


@router.delete("/{court_id}", status_code=status.HTTP_204_NO_CONTENT,
               summary="Eliminar cancha (admin)")
def delete_court(court_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)) -> None:
    _require_admin(user)
    court = court_service.get_court(db, court_id)
    if court is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La cancha no existe")
    court_service.delete_court(db, court)
