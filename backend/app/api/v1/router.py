from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from app.core.database import get_db
from app.models.humedal import HumedalModel, ContenedorModel, NodoModel, LecturaModel
from app.models.sistema import ParametroModel, DetalleLecturaModel, AlertaModel
from app.schemas.humedal import (
    HumedalResponse,
    ContenedorResponse,
    NodoResponse,
    LecturaResponse,
    IngestaRequest,
    IngestaResponse,
)
from app.schemas.sistema import (
    ParametroResponse,
    DetalleLecturaResponse,
    AlertaResponse,
    AlertaUpdate,
    DashboardResumenResponse,
)
from app.services.ingesta import (
    NodoNoEncontradoError,
    LecturaInvalidaError,
    registrar_ingesta,
)

router = APIRouter()


@router.get("/dashboard/resumen", response_model=DashboardResumenResponse, tags=["Dashboard"])
def get_dashboard_resumen(db: Session = Depends(get_db)):
    total_mediciones = db.scalar(select(func.count()).select_from(LecturaModel)) or 0
    return {"total_mediciones": int(total_mediciones)}


@router.get("/humedales", response_model=List[HumedalResponse], tags=["Humedales"])
def get_humedales(db: Session = Depends(get_db)):
    humedales = db.scalars(select(HumedalModel)).all()
    return humedales


@router.get("/contenedores", response_model=List[ContenedorResponse], tags=["Contenedores"])
def get_contenedores(
    hum_id: Optional[int] = Query(None, description="Filtrar por ID de humedal"),
    db: Session = Depends(get_db)
):
    stmt = select(ContenedorModel)
    if hum_id is not None:
        stmt = stmt.where(ContenedorModel.con_hum_id == hum_id)
    contenedores = db.scalars(stmt).all()
    return contenedores


@router.get("/nodos", response_model=List[NodoResponse], tags=["Nodos"])
def get_nodos(
    hum_id: Optional[int] = Query(None, description="Filtrar por ID de humedal"),
    con_id: Optional[int] = Query(None, description="Filtrar por ID de contenedor"),
    db: Session = Depends(get_db)
):
    stmt = select(NodoModel)
    if hum_id is not None:
        stmt = stmt.where(NodoModel.nod_hum_id == hum_id)
    if con_id is not None:
        stmt = stmt.where(NodoModel.nod_con_id == con_id)
    nodos = db.scalars(stmt).all()
    return nodos


@router.get("/mediciones", response_model=List[LecturaResponse], tags=["Mediciones"])
def get_mediciones(
    limit: int = Query(50, ge=1, le=500, description="Cantidad máxima de mediciones recientes"),
    nod_id: Optional[int] = Query(None, description="Filtrar por ID de nodo"),
    db: Session = Depends(get_db)
):
    stmt = select(LecturaModel)
    if nod_id is not None:
        stmt = stmt.where(LecturaModel.lec_nod_id == nod_id)
    stmt = stmt.order_by(LecturaModel.lec_fecha_hora.desc().nullslast()).limit(limit)
    mediciones = db.scalars(stmt).all()
    return mediciones


@router.get("/mediciones/graficas", response_model=List[LecturaResponse], tags=["Mediciones"])
def get_mediciones_graficas(
    nod_id: Optional[int] = Query(None, description="Filtrar por ID de nodo"),
    limit: int = Query(100, ge=1, le=1000, description="Cantidad máxima de puntos para gráfica"),
    db: Session = Depends(get_db)
):
    stmt = select(LecturaModel)
    if nod_id is not None:
        stmt = stmt.where(LecturaModel.lec_nod_id == nod_id)
    stmt = stmt.order_by(LecturaModel.lec_fecha_hora.desc().nullslast()).limit(limit)
    mediciones = list(db.scalars(stmt).all())
    mediciones.reverse()
    return mediciones


@router.post(
    "/lecturas/ingesta",
    response_model=IngestaResponse,
    status_code=201,
    tags=["Ingesta"],
)
def ingesta_lectura(payload: IngestaRequest, db: Session = Depends(get_db)):
    try:
        resultado = registrar_ingesta(
            db=db,
            nodo_codigo=payload.nodo_codigo,
            lecturas=payload.lecturas,
            fecha_hora=payload.fecha_hora,
        )
    except NodoNoEncontradoError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except LecturaInvalidaError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return resultado


@router.get("/parametros", response_model=List[ParametroResponse], tags=["Parámetros"])
def get_parametros(db: Session = Depends(get_db)):
    stmt = select(ParametroModel).where(ParametroModel.par_activo == True)
    parametros = db.scalars(stmt).all()
    return parametros


@router.get("/mediciones/detalle", response_model=List[DetalleLecturaResponse], tags=["Mediciones"])
def get_mediciones_detalle(
    limit: int = Query(100, ge=1, le=500),
    par_id: Optional[int] = Query(None, description="Filtrar por ID de parámetro"),
    nod_id: Optional[int] = Query(None, description="Filtrar por ID de nodo"),
    db: Session = Depends(get_db)
):
    stmt = select(DetalleLecturaModel).join(ParametroModel, DetalleLecturaModel.det_par_id == ParametroModel.par_id)
    if par_id is not None:
        stmt = stmt.where(DetalleLecturaModel.det_par_id == par_id)
    if nod_id is not None:
        # join with lectura if nod_id filter needed
        stmt = stmt.join(LecturaModel, DetalleLecturaModel.det_lec_id == LecturaModel.lec_id).where(LecturaModel.lec_nod_id == nod_id)

    stmt = stmt.order_by(DetalleLecturaModel.det_creado_at.desc().nullslast()).limit(limit)
    detalles = db.scalars(stmt).all()

    # Map with parameter attributes
    result = []
    for d in detalles:
        item = DetalleLecturaResponse.model_validate(d)
        if d.parametro:
            item.parametro_nombre = d.parametro.par_nombre
            item.parametro_codigo = d.parametro.par_codigo
        result.append(item)
    return result


@router.get("/alertas", response_model=List[AlertaResponse], tags=["Alertas"])
def get_alertas(
    estado: Optional[str] = Query(None, description="Filtrar por estado (pendiente, atendida, etc.)"),
    db: Session = Depends(get_db)
):
    stmt = select(AlertaModel)
    if estado is not None:
        stmt = stmt.where(AlertaModel.ale_estado == estado)
    stmt = stmt.order_by(AlertaModel.ale_generada_at.desc().nullslast())
    alertas = db.scalars(stmt).all()
    return alertas


@router.patch("/alertas/{ale_id}/atender", response_model=AlertaResponse, tags=["Alertas"])
def atender_alerta(ale_id: int, db: Session = Depends(get_db)):
    alerta = db.get(AlertaModel, ale_id)
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.ale_estado = "atendida"
    alerta.ale_atendida_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alerta)
    return alerta
