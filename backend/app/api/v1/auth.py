from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, decode_access_token, verify_password
from app.models.sistema import UsuarioModel
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.sistema import UsuarioResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No autenticado o token inválido",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UsuarioModel:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise CREDENTIALS_EXCEPTION

    try:
        payload = decode_access_token(credentials.credentials)
        subject = payload.get("sub")
        user_id = int(subject) if subject is not None else None
    except (JWTError, ValueError, TypeError):
        raise CREDENTIALS_EXCEPTION

    if user_id is None:
        raise CREDENTIALS_EXCEPTION

    user = db.get(UsuarioModel, user_id)
    if user is None or not user.usr_activo:
        raise CREDENTIALS_EXCEPTION

    return user


def require_roles(allowed_roles: list[str]):
    def dependency(
        current_user: UsuarioModel = Depends(get_current_user),
    ) -> UsuarioModel:
        role_name = current_user.rol.rol_nombre if current_user.rol else None
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta operación",
            )
        return current_user

    return dependency


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    correo = payload.correo.strip().lower()
    user = db.scalars(
        select(UsuarioModel).where(func.lower(UsuarioModel.usr_correo) == correo)
    ).first()

    if (
        user is None
        or not user.usr_activo
        or not verify_password(payload.password, user.usr_password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    token = create_access_token(
        subject=user.usr_id,
        extra_claims={"rol": user.rol.rol_nombre if user.rol else None},
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        usuario=UsuarioResponse.model_validate(user),
    )


@router.get("/me", response_model=UsuarioResponse)
def read_me(current_user: UsuarioModel = Depends(get_current_user)):
    return UsuarioResponse.model_validate(current_user)
