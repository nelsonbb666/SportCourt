"""Esquemas Pydantic de Usuario (entrada/salida de la API)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=120, examples=["Ana Pérez"])
    email: EmailStr = Field(..., examples=["ana@example.com"])
    phone: str | None = Field(None, max_length=30, examples=["+57 300 1234567"])


class UserCreate(UserBase):
    """Datos para registrar un usuario."""

    password: str = Field(..., min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def password_tiene_letra_y_numero(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra y un número")
        return v


class UserUpdate(BaseModel):
    """Datos para editar el perfil (todos opcionales)."""

    full_name: str | None = Field(None, min_length=3, max_length=120)
    phone: str | None = Field(None, max_length=30)


class UserOut(BaseModel):
    """Representación pública del usuario (nunca expone la contraseña)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


class PasswordResetRequest(BaseModel):
    """Solicitud de recuperación: solo se envía el correo."""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
