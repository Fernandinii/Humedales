from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class SensorResponse(BaseModel):
    sen_id: int
    sen_nod_id: int
    sen_tipo: str
    sen_modelo: Optional[str] = None
    sen_unidad: Optional[str] = None
    sen_fecha_instalacion: Optional[date] = None
    sen_activo: bool
    sen_fabricante: Optional[str] = None
    sen_numero_serie: Optional[str] = None
    sen_configuracion: dict

    model_config = ConfigDict(from_attributes=True)


class SensorParametroResponse(BaseModel):
    senpar_id: int
    senpar_sen_id: int
    senpar_par_id: int
    senpar_unidad: str
    senpar_resolucion: Optional[float] = None
    senpar_minimo: Optional[float] = None
    senpar_maximo: Optional[float] = None
    senpar_config: dict
    senpar_activo: bool

    model_config = ConfigDict(from_attributes=True)


class SensorCreate(BaseModel):
    sen_nod_id: int
    sen_tipo: str = Field(..., min_length=1, max_length=40)
    sen_modelo: Optional[str] = Field(None, max_length=100)
    sen_unidad: Optional[str] = Field(None, max_length=30)
    sen_fecha_instalacion: Optional[date] = None
    sen_activo: bool = True
    sen_fabricante: Optional[str] = Field(None, max_length=100)
    sen_numero_serie: Optional[str] = Field(None, max_length=120)
    sen_configuracion: dict[str, Any] = Field(default_factory=dict)


class SensorUpdate(BaseModel):
    sen_nod_id: Optional[int] = None
    sen_tipo: Optional[str] = Field(None, min_length=1, max_length=40)
    sen_modelo: Optional[str] = Field(None, max_length=100)
    sen_unidad: Optional[str] = Field(None, max_length=30)
    sen_fecha_instalacion: Optional[date] = None
    sen_activo: Optional[bool] = None
    sen_fabricante: Optional[str] = Field(None, max_length=100)
    sen_numero_serie: Optional[str] = Field(None, max_length=120)
    sen_configuracion: Optional[dict[str, Any]] = None


class SensorParametroCreate(BaseModel):
    senpar_par_id: int
    senpar_unidad: str = Field(..., min_length=1, max_length=30)
    senpar_resolucion: Optional[float] = Field(None, gt=0)
    senpar_minimo: Optional[float] = None
    senpar_maximo: Optional[float] = None
    senpar_config: dict[str, Any] = Field(default_factory=dict)
    senpar_activo: bool = True


class SensorParametroUpdate(BaseModel):
    senpar_unidad: Optional[str] = Field(None, min_length=1, max_length=30)
    senpar_resolucion: Optional[float] = Field(None, gt=0)
    senpar_minimo: Optional[float] = None
    senpar_maximo: Optional[float] = None
    senpar_config: Optional[dict[str, Any]] = None
    senpar_activo: Optional[bool] = None
