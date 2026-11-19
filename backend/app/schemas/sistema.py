from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RolResponse(BaseModel):
    rol_id: int
    rol_nombre: str
    rol_descripcion: Optional[str] = None
    rol_activo: Optional[bool] = True

    model_config = ConfigDict(from_attributes=True)


class UsuarioResponse(BaseModel):
    usr_id: int
    usr_rol_id: Optional[int] = None
    usr_nombre: str
    usr_apellido: Optional[str] = None
    usr_correo: str
    usr_activo: Optional[bool] = True
    usr_creado_at: Optional[datetime] = None
    rol_nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UsuarioCreate(BaseModel):
    usr_rol_id: int
    usr_nombre: str = Field(..., min_length=1, max_length=100)
    usr_apellido: Optional[str] = Field(None, max_length=150)
    usr_correo: str = Field(..., min_length=3, max_length=254)
    usr_password: str = Field(..., min_length=8, max_length=128)
    usr_activo: bool = True


class UsuarioUpdate(BaseModel):
    usr_rol_id: Optional[int] = None
    usr_nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    usr_apellido: Optional[str] = Field(None, max_length=150)
    usr_password: Optional[str] = Field(None, min_length=8, max_length=128)
    usr_activo: Optional[bool] = None


class ParametroResponse(BaseModel):
    par_id: int
    par_codigo: str
    par_nombre: str
    par_descripcion: Optional[str] = None
    par_tipo_valor: Optional[str] = None
    par_unidad_ref: Optional[str] = None
    par_origen: Optional[str] = None
    par_minimo: Optional[float] = None
    par_maximo: Optional[float] = None
    par_activo: Optional[bool] = True

    model_config = ConfigDict(from_attributes=True)


class DetalleLecturaResponse(BaseModel):
    det_id: int
    det_lec_id: int
    det_par_id: int
    det_valor_num: Optional[float] = None
    det_valor_texto: Optional[str] = None
    det_valor_booleano: Optional[bool] = None
    det_unidad: Optional[str] = None
    det_estado: Optional[str] = None
    det_creado_at: Optional[datetime] = None
    parametro_nombre: Optional[str] = None
    parametro_codigo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertaResponse(BaseModel):
    ale_id: int
    ale_nod_id: Optional[int] = None
    ale_lectura_id: Optional[int] = None
    ale_tipo: Optional[str] = None
    ale_severidad: Optional[str] = None
    ale_titulo: str
    ale_descripcion: Optional[str] = None
    ale_generada_at: Optional[datetime] = None
    ale_atendida_at: Optional[datetime] = None
    ale_estado: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertaUpdate(BaseModel):
    ale_estado: str
    ale_atendida_at: Optional[datetime] = None


class ParametroUpdate(BaseModel):
    par_minimo: Optional[float] = None
    par_maximo: Optional[float] = None
    par_unidad_ref: Optional[str] = Field(None, max_length=30)


class DashboardResumenResponse(BaseModel):
    total_mediciones: int
