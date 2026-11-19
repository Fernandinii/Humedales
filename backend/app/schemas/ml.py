from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ModeloMLResponse(BaseModel):
    mod_id: int
    mod_nombre: str
    mod_version: str
    mod_descripcion: Optional[str] = None
    mod_algoritmo: Optional[str] = None
    mod_ruta_archivo: Optional[str] = None
    mod_entrenado_at: Optional[datetime] = None
    mod_activo: bool
    mod_creado_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PrediccionLecturaResponse(BaseModel):
    pre_id: int
    pre_nod_id: int
    pre_mod_id: int
    pre_lectura_ref_id: Optional[int] = None
    pre_parametro: str
    pre_valor_predicho: float
    pre_unidad: Optional[str] = None
    pre_fecha_objetivo: Optional[datetime] = None
    pre_generado_at: datetime
    pre_confianza: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class EntrenarMLRequest(BaseModel):
    nod_id: int = Field(..., description="ID del nodo a entrenar")
    parametros: Optional[List[str]] = Field(
        None,
        description="Códigos de parámetro a proyectar; por defecto los cinco principales",
    )
    horizonte: int = Field(
        12, ge=1, le=48, description="Cantidad de intervalos futuros a proyectar"
    )


class EntrenamientoResultado(BaseModel):
    parametro: str
    parametro_nombre: Optional[str] = None
    estado: str
    mensaje: Optional[str] = None
    modelo_id: Optional[int] = None
    modelo_nombre: Optional[str] = None
    modelo_version: Optional[str] = None
    algoritmo: Optional[str] = None
    r2: Optional[float] = None
    intervalo_segundos: Optional[int] = None
    predicciones: int = 0
    alertas: int = 0
    confianza_promedio: Optional[float] = None


class EntrenarMLResponse(BaseModel):
    nodo_id: int
    nodo_codigo: Optional[str] = None
    modelos_entrenados: int
    predicciones_generadas: int
    alertas_generadas: int
    resultados: List[EntrenamientoResultado]
