"""Lógica de negocio para usuarios y autenticación."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class EmailAlreadyExistsError(Exception):
    """El correo electrónico ya está registrado en el sistema."""


class InvalidCredentialsError(Exception):
    """Las credenciales proporcionadas no son válidas."""


class WrongPasswordError(Exception):
    """La contraseña actual proporcionada no coincide."""


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def register_user(db: Session, data: UserCreate) -> User:
    """Registra un nuevo usuario. Lanza EmailAlreadyExistsError si el correo ya existe."""
    existing = get_user_by_email(db, data.email)
    if existing is not None:
        raise EmailAlreadyExistsError(data.email)

    user = User(
        full_name=data.full_name.strip(),
        email=data.email.lower(),
        phone=data.phone,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Valida credenciales. Lanza InvalidCredentialsError si son incorrectas."""
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError()
    return user


def login(db: Session, email: str, password: str) -> tuple[User, str]:
    """Autentica y devuelve (usuario, token_jwt).

    El rol de administrador se autoproclama la primera vez que se inicia sesión
    con las credenciales semilla configuradas (ADMIN_EMAIL/ADMIN_PASSWORD), de
    modo que el sistema cuente siempre con un admin sin migraciones extra.
    """
    user = authenticate_user(db, email, password)
    if user.email.lower() == settings.ADMIN_EMAIL.lower() and not user.is_admin:
        user.is_admin = True
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(subject=user.id, is_admin=user.is_admin)
    return user, token


def update_profile(db: Session, user: User, data: UserUpdate) -> User:
    """Edita el perfil del usuario (nombre y/o teléfono)."""
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.phone is not None:
        user.phone = data.phone
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    """Cambia la contraseña verificando la actual."""
    if not verify_password(current_password, user.hashed_password):
        raise WrongPasswordError()
    user.hashed_password = hash_password(new_password)
    db.add(user)
    db.commit()


def set_new_password(db: Session, user: User, new_password: str) -> None:
    """Establece una nueva contraseña (usado en la recuperación de contraseña)."""
    user.hashed_password = hash_password(new_password)
    db.add(user)
    db.commit()
