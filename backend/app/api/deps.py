"""Dependencias de FastAPI: autenticación mediante bearer token JWT."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token, token_is_admin
from app.db.session import get_db
from app.models.user import User
from app.services import user_service

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No autenticado o sesión expirada",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Devuelve el usuario autenticado a partir del token JWT; 401 si es inválido."""
    if credentials is None:
        raise CREDENTIALS_ERROR
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise CREDENTIALS_ERROR
    user = user_service.get_user_by_id(db, int(user_id))
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    return user


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Devuelve el usuario autenticado solo si tiene rol de administrador.

    Verifica la reclamación 'admin' del token y además el estado actual del
    usuario en base de datos (por si el rol fue revocado tras emitir el token).
    """
    if credentials is None:
        raise CREDENTIALS_ERROR
    if not token_is_admin(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede realizar esta acción",
        )
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise CREDENTIALS_ERROR
    user = user_service.get_user_by_id(db, int(user_id))
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede realizar esta acción",
        )
    return user
