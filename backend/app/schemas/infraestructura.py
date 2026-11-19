from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ConexionContenedorResponse(BaseModel):
    cco_id: int
    cco_origen_id: int
    cco_destino_id: int
    cco_descripcion: Optional[str] = None
    cco_activa: bool
    cco_creada_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DispositivoUsuarioResponse(BaseModel):
    dis_id: int
    dis_usr_id: int
    dis_token_hash: str
    dis_plataforma: str
    dis_activo: bool
    dis_creado_at: datetime
    dis_actualizado_at: datetime

    model_config = ConfigDict(from_attributes=True)
