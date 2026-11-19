from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class HumedalResponse(BaseModel):
    hum_id: int
    hum_nombre: str
    hum_descripcion: Optional[str] = None
    hum_ubicacion: Optional[str] = None
    hum_latitud: Optional[float] = None
    hum_longitud: Optional[float] = None
    hum_activo: Optional[bool] = True
    hum_creado_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ContenedorResponse(BaseModel):
    con_id: int
    con_hum_id: Optional[int] = None
    con_codigo: Optional[str] = None
    con_nombre: str
    con_descripcion: Optional[str] = None
    con_orden: Optional[int] = None
    con_activo: Optional[bool] = True
    con_creado_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NodoResponse(BaseModel):
    nod_id: int
    nod_hum_id: Optional[int] = None
    nod_nombre: str
    nod_codigo: Optional[str] = None
    nod_ubicacion: Optional[str] = None
    nod_activo: Optional[bool] = True
    nod_creado_at: Optional[datetime] = None
    nod_con_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class LecturaResponse(BaseModel):
    lec_id: int
    lec_nod_id: Optional[int] = None
    lec_ph: Optional[float] = None
    lec_temperatura: Optional[float] = None
    lec_turbidez: Optional[float] = None
    lec_tds_ppm: Optional[float] = None
    lec_conductividad_us_cm: Optional[float] = None
    lec_fecha_hora: Optional[datetime] = None
    lec_recibido_at: Optional[datetime] = None
    lec_id_paquete: Optional[str] = None
    lec_payload_original: Optional[dict] = None
    lec_rssi: Optional[int] = None
    lec_secuencia: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class HumedalCreate(BaseModel):
    hum_nombre: str = Field(..., min_length=1, max_length=150)
    hum_descripcion: Optional[str] = None
    hum_ubicacion: Optional[str] = Field(None, max_length=250)
    hum_latitud: Optional[float] = Field(None, ge=-90, le=90)
    hum_longitud: Optional[float] = Field(None, ge=-180, le=180)
    hum_activo: bool = True


class HumedalUpdate(BaseModel):
    hum_nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    hum_descripcion: Optional[str] = None
    hum_ubicacion: Optional[str] = Field(None, max_length=250)
    hum_latitud: Optional[float] = Field(None, ge=-90, le=90)
    hum_longitud: Optional[float] = Field(None, ge=-180, le=180)
    hum_activo: Optional[bool] = None


class ContenedorCreate(BaseModel):
    con_hum_id: int
    con_codigo: str = Field(..., min_length=1, max_length=50)
    con_nombre: str = Field(..., min_length=1, max_length=150)
    con_descripcion: Optional[str] = None
    con_orden: Optional[int] = Field(None, gt=0)
    con_activo: bool = True


class ContenedorUpdate(BaseModel):
    con_hum_id: Optional[int] = None
    con_codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    con_nombre: Optional[str] = Field(None, min_length=1, max_length=150)
    con_descripcion: Optional[str] = None
    con_orden: Optional[int] = Field(None, gt=0)
    con_activo: Optional[bool] = None


class NodoCreate(BaseModel):
    nod_hum_id: int
    nod_nombre: str = Field(..., min_length=1, max_length=100)
    nod_codigo: str = Field(..., min_length=1, max_length=100)
    nod_ubicacion: Optional[str] = Field(None, max_length=250)
    nod_con_id: Optional[int] = None
    nod_activo: bool = True


class NodoUpdate(BaseModel):
    nod_hum_id: Optional[int] = None
    nod_nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    nod_codigo: Optional[str] = Field(None, min_length=1, max_length=100)
    nod_ubicacion: Optional[str] = Field(None, max_length=250)
    nod_con_id: Optional[int] = None
    nod_activo: Optional[bool] = None


class IngestaRequest(BaseModel):
    nodo_codigo: str = Field(..., min_length=1, description="Código único del nodo emisor")
    lecturas: dict[str, float] = Field(..., min_length=1, description="Valores por código de parámetro")
    fecha_hora: Optional[datetime] = Field(None, description="Fecha de captura en el nodo (opcional)")


class IngestaResponse(BaseModel):
    lectura_id: int
    nodo_id: int
    nodo_codigo: str
    detalles_insertados: int
    alertas_generadas: int
    parametros_ignorados: list[str] = []
    alertas: list[str] = []
