"""Esquemas Pydantic de canchas y deportes."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CourtBase(BaseModel):
    name: str = Field(min_length=2, max_length=120, examples=["Cancha Central"])
    sport_id: int = Field(gt=0, description="Id del deporte (ver GET /courts/sports)")
    location: str = Field(min_length=3, max_length=255, examples=["Calle 45 #12-34"])
    price_per_hour: float = Field(gt=0, le=1_000_000, examples=[35000.0])
    capacity: int = Field(ge=1, le=100, default=10)
    description: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)


class CourtCreate(CourtBase):
    pass


class CourtUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    sport_id: int | None = Field(default=None, gt=0)
    location: str | None = Field(default=None, min_length=3, max_length=255)
    price_per_hour: float | None = Field(default=None, gt=0, le=1_000_000)
    capacity: int | None = Field(default=None, ge=1, le=100)
    description: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    is_available: bool | None = None


class CourtOut(CourtBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_available: bool
    created_at: datetime
    updated_at: datetime
    sport: SportOut | None = None
