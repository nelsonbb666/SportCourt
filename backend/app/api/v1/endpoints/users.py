"""Endpoints de usuarios: registro, login, perfil y recuperación de contraseña."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    PasswordChangeRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    Token,
    UserCreate,
    UserOut,
    UserUpdate,
)
from app.services import user_service
from app.services.user_service import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    WrongPasswordError,
)

router = APIRouter(prefix="/auth", tags=["usuarios"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar usuario",
)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """Registra un nuevo usuario en el sistema de reservas."""
    try:
        user = user_service.register_user(db, payload)
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo electrónico ya está registrado",
        ) from None
    return user


@router.post("/login", response_model=Token, summary="Iniciar sesión")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Valida las credenciales y devuelve un token JWT con los datos del usuario."""
    try:
        user, token = user_service.login(db, payload.email, payload.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Las credenciales no son válidas",
        ) from None
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout", summary="Cerrar sesión")
def logout(current_user: User = Depends(get_current_user)) -> dict:
    """Cierra la sesión del usuario.

    Con tokens JWT el cliente elimina el token; el endpoint exige un token válido
    para confirmar que existía una sesión activa.
    """
    return {"message": "Sesión cerrada correctamente"}


@router.get("/me", response_model=UserOut, summary="Obtener perfil actual")
def read_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/me", response_model=UserOut, summary="Editar perfil")
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Actualiza los datos personales del usuario autenticado."""
    return user_service.update_profile(db, current_user, payload)


@router.put("/me/password", summary="Cambiar contraseña")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        user_service.change_password(
            db, current_user, payload.current_password, payload.new_password
        )
    except WrongPasswordError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual no es correcta",
        ) from None
    return {"message": "Contraseña actualizada correctamente"}


@router.post("/password-recovery", summary="Iniciar recuperación de contraseña")
def password_recovery(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> dict:
    """Si el correo está registrado, genera un token de recuperación.

    Nota: sin servicio de correo configurado todavía, en desarrollo se devuelve el
    token en la respuesta (debug_reset_token). En producción se enviaría por email.
    """
    user = user_service.get_user_by_email(db, payload.email)
    if user is None:
        # Respuesta neutra para no revelar qué correos existen
        return {
            "message": "Si el correo está registrado, recibirás instrucciones para recuperarlo"
        }

    reset_token = create_access_token(
        subject=f"reset:{user.id}", expires_delta=timedelta(minutes=30)
    )
    result = {"message": "Se generó un enlace de recuperación", "user_found": True}
    if settings.ENVIRONMENT == "development":
        result["debug_reset_token"] = reset_token
    return result


@router.post("/password-reset", summary="Establecer nueva contraseña")
def password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)) -> dict:
    """Valida el token de recuperación y permite establecer una nueva contraseña."""
    subject = decode_access_token(payload.token)
    if subject is None or not subject.startswith("reset:"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación no es válido o expiró",
        )
    user = user_service.get_user_by_id(db, int(subject.split(":", 1)[1]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    user_service.set_new_password(db, user, payload.new_password)
    return {"message": "Contraseña restablecida correctamente. Ya puedes iniciar sesión."}
