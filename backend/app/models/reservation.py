"""Modelo ORM de Reservation (reserva de cancha)."""
from datetime import date, datetime, time, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.court import Court

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Reservation(Base):
    """Reserva de una cancha por un usuario en un día y franja horaria concretos."""

    __tablename__ = "reservations"
    __table_args__ = (
        UniqueConstraint("court_id", "date", "start_time", name="uq_reservation_slot"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    court_id: Mapped[int] = mapped_column(ForeignKey("courts.id"), index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="confirmed")
    total_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    court: Mapped[Court] = relationship("Court", lazy="joined")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Reservation id={self.id} court_id={self.court_id} "
            f"date={self.date} start={self.start_time}>"
        )
