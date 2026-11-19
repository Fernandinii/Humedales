from pydantic import BaseModel, Field

from app.schemas.sistema import UsuarioResponse


class LoginRequest(BaseModel):
    correo: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse
