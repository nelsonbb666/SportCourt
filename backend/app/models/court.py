"""Modelo ORM de Court (cancha)."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SportType(Base):
    """Disciplina deportiva disponible (fútbol, baloncesto, tenis…)."""

    __tablename__ = "sports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Sport id={self.id} name={self.name!r}>"


class Court(Base):
    """Cancha que los usuarios pueden reservar."""

    __tablename__ = "courts"
    __table_args__ = (UniqueConstraint("name", "sport_id", name="uq_court_name_sport"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sport_id: Mapped[int] = mapped_column(ForeignKey("sports.id"), nullable=False, index=True)
    sport: Mapped[SportType] = relationship("SportType", lazy="joined")
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    price_per_hour: Mapped[float] = mapped_column(Float, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Court id={self.id} name={self.name!r} sport_id={self.sport_id}>"
