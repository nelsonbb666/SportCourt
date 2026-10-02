"""Esquemas Pydantic de reservas."""
from __future__ import annotations

from datetime import date as date_t, datetime, time as time_t

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.court import CourtOut

RESERVABLE_STATUS = {"confirmed"}
CANCELABLE_STATUS = {"confirmed"}


class ReservationCreate(BaseModel):
    court_id: int = Field(gt=0)
    date: date_t
    start_time: time_t
    end_time: time_t
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_times(self) -> "ReservationCreate":
        if self.end_time <= self.start_time:
            raise ValueError("La hora de fin debe ser mayor que la hora de inicio")
        return self


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    court_id: int
    date: date_t
    start_time: time_t
    end_time: time_t
    status: str
    total_price: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
    court: CourtOut | None = None


class ReservationUpdate(BaseModel):
    """Modificar una reserva: solo se permite cambiar día/hora/notas."""

    date: date_t | None = None
    start_time: time_t | None = None
    end_time: time_t | None = None
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_times(self) -> "ReservationUpdate":
        if self.start_time is not None and self.end_time is not None:
            if self.end_time <= self.start_time:
                raise ValueError("La hora de fin debe ser mayor que la hora de inicio")
        return self
