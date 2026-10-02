"""Servicio de reservas: crear, listar, modificar, cancelar y disponibilidad."""
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.court import Court
from app.models.reservation import Reservation
from app.schemas.reservation import ReservationCreate, ReservationUpdate

OPENING_TIME = time(6, 0)
CLOSING_TIME = time(22, 0)
MIN_HOURS = 1
MAX_HOURS = 4


class CourtNotAvailableError(Exception):
    """La cancha no existe o está marcada como no disponible."""


class SlotUnavailableError(Exception):
    """La franja horaria solicitada choca con otra reserva."""


class InvalidSlotError(Exception):
    """La franja horaria es inválida (fuera de horario, pasado o duración incorrecta)."""


class ReservationNotFoundError(Exception):
    """La reserva no existe."""


def _duration_hours(start: time, end: time) -> float:
    start_dt = datetime.combine(date(2000, 1, 1), start)
    end_dt = datetime.combine(date(2000, 1, 1), end)
    return (end_dt - start_dt).total_seconds() / 3600.0


def validate_slot(slot_date: date, start: time, end: time) -> float:
    """Valida la franja y devuelve su duración en horas. Lanza InvalidSlotError si no."""
    today = datetime.now(timezone.utc).date()
    if slot_date < today:
        raise InvalidSlotError("No se pueden reservar fechas pasadas")
    if start < OPENING_TIME or end > CLOSING_TIME:
        raise InvalidSlotError(
            f"El horario de operación es de {OPENING_TIME:%H:%M} a {CLOSING_TIME:%H:%M}"
        )
    hours = _duration_hours(start, end)
    if hours < MIN_HOURS:
        raise InvalidSlotError("La reserva mínima es de 1 hora")
    if hours > MAX_HOURS:
        raise InvalidSlotError("La reserva máxima es de 4 horas")
    return hours


def _overlaps(db: Session, court_id: int, slot_date: date, start: time, end: time,
              exclude_id: int | None = None) -> bool:
    """Comprueba si alguna reserva confirmada cruza la franja pedida."""
    stmt = select(Reservation).where(
        Reservation.court_id == court_id,
        Reservation.date == slot_date,
        Reservation.status == "confirmed",
    )
    if exclude_id is not None:
        stmt = stmt.where(Reservation.id != exclude_id)
    for res in db.scalars(stmt):
        if start < res.end_time and end > res.start_time:
            return True
    return False


def create_reservation(db: Session, user_id: int, payload: ReservationCreate) -> Reservation:
    court = db.get(Court, payload.court_id)
    if court is None or not court.is_available:
        raise CourtNotAvailableError()
    hours = validate_slot(payload.date, payload.start_time, payload.end_time)
    if _overlaps(db, court.id, payload.date, payload.start_time, payload.end_time):
        raise SlotUnavailableError()
    reservation = Reservation(
        user_id=user_id,
        court_id=court.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        total_price=round(court.price_per_hour * hours, 2),
        notes=payload.notes,
        status="confirmed",
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def list_user_reservations(db: Session, user_id: int) -> list[Reservation]:
    stmt = (
        select(Reservation)
        .where(Reservation.user_id == user_id)
        .options(joinedload(Reservation.court))
        .order_by(Reservation.date.desc(), Reservation.start_time.desc())
    )
    return list(db.scalars(stmt))


def get_user_reservation(db: Session, user_id: int, reservation_id: int) -> Reservation | None:
    res = db.get(Reservation, reservation_id)
    if res is None or res.user_id != user_id:
        return None
    return res


def update_reservation(db: Session, reservation: Reservation,
                       payload: ReservationUpdate) -> Reservation:
    data = payload.model_dump(exclude_unset=True)
    new_date = data.get("date", reservation.date)
    new_start = data.get("start_time", reservation.start_time)
    new_end = data.get("end_time", reservation.end_time)
    hours = validate_slot(new_date, new_start, new_end)
    if _overlaps(db, reservation.court_id, new_date, new_start, new_end,
                 exclude_id=reservation.id):
        raise SlotUnavailableError()
    court = db.get(Court, reservation.court_id)
    for key, value in data.items():
        setattr(reservation, key, value)
    reservation.total_price = round((court.price_per_hour if court else 0) * hours, 2)
    db.commit()
    db.refresh(reservation)
    return reservation


def cancel_reservation(db: Session, reservation: Reservation) -> Reservation:
    reservation.status = "cancelled"
    db.commit()
    db.refresh(reservation)
    return reservation


def available_slots(db: Session, court_id: int, slot_date: date) -> list[dict]:
    """Devuelve las franjas horarias libres (bloques de 1h) de una cancha en un día."""
    court = db.get(Court, court_id)
    if court is None:
        raise CourtNotAvailableError()
    reservations = db.scalars(
        select(Reservation).where(
            Reservation.court_id == court_id,
            Reservation.date == slot_date,
            Reservation.status == "confirmed",
        )
    )
    busy: list[tuple[time, time]] = [(r.start_time, r.end_time) for r in reservations]
    slots: list[dict] = []
    hour = OPENING_TIME.hour
    while hour + 1 <= CLOSING_TIME.hour:
        start = time(hour, 0)
        end = time(hour + 1, 0)
        occupied = any(start < b_end and end > b_start for b_start, b_end in busy)
        slots.append({"start_time": start.strftime("%H:%M"),
                      "end_time": end.strftime("%H:%M"),
                      "available": not occupied})
        hour += 1
    return slots
