"""Endpoints de reservas: crear, listar mis reservas, modificar y cancelar."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.reservation import ReservationCreate, ReservationOut, ReservationUpdate
from app.services import reservation_service
from app.services.reservation_service import (
    CourtNotAvailableError,
    InvalidSlotError,
    SlotUnavailableError,
)

router = APIRouter(prefix="/reservations", tags=["reservas"])


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED,
             summary="Reservar una cancha")
def create_reservation(payload: ReservationCreate, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)) -> Reservation:
    """Registra la reserva de una cancha para el usuario autenticado."""
    try:
        return reservation_service.create_reservation(db, user.id, payload)
    except CourtNotAvailableError:
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            detail="La cancha no existe o no está disponible") from None
    except InvalidSlotError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(exc)) from None
    except SlotUnavailableError:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            detail="La franja horaria seleccionada ya está reservada") from None


@router.get("/me", response_model=list[ReservationOut], summary="Mis reservas")
def my_reservations(db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)) -> list[Reservation]:
    return reservation_service.list_user_reservations(db, user.id)


@router.get("/{reservation_id}", response_model=ReservationOut, summary="Detalle de reserva")
def get_reservation(reservation_id: int, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)) -> Reservation:
    res = reservation_service.get_user_reservation(db, user.id, reservation_id)
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La reserva no existe")
    return res


@router.put("/{reservation_id}", response_model=ReservationOut,
            summary="Modificar una reserva propia")
def update_reservation(reservation_id: int, payload: ReservationUpdate,
                       db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)) -> Reservation:
    res = reservation_service.get_user_reservation(db, user.id, reservation_id)
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La reserva no existe")
    if res.status != "confirmed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail="Solo se pueden modificar reservas confirmadas")
    try:
        return reservation_service.update_reservation(db, res, payload)
    except InvalidSlotError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=str(exc)) from None
    except SlotUnavailableError:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            detail="La nueva franja horaria ya está reservada") from None


@router.delete("/{reservation_id}", response_model=ReservationOut,
               summary="Cancelar una reserva propia")
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)) -> Reservation:
    res = reservation_service.get_user_reservation(db, user.id, reservation_id)
    if res is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="La reserva no existe")
    if res.status != "confirmed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail="La reserva ya fue cancelada")
    return reservation_service.cancel_reservation(db, res)
