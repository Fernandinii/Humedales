from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.models.ml import ModeloMLModel, PrediccionLecturaModel
from app.models.sistema import UsuarioModel
from app.schemas.ml import (
    EntrenarMLRequest,
    EntrenarMLResponse,
    ModeloMLResponse,
    PrediccionLecturaResponse,
)
from app.services.ml_service import MLServiceError, entrenar_y_predecir

router = APIRouter(prefix="/ml", tags=["Análisis Predictivo"])

require_ml = require_roles(["Administrador", "Investigador"])


@router.get("/modelos", response_model=List[ModeloMLResponse])
def get_modelos(db: Session = Depends(get_db)):
    stmt = select(ModeloMLModel).order_by(
        ModeloMLModel.mod_entrenado_at.desc().nullslast(),
        ModeloMLModel.mod_id.desc(),
    )
    return db.scalars(stmt).all()


@router.post(
    "/entrenar",
    response_model=EntrenarMLResponse,
    status_code=status.HTTP_201_CREATED,
)
def entrenar_modelos(
    payload: EntrenarMLRequest,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_ml),
):
    try:
        return entrenar_y_predecir(
            db=db,
            nodo_id=payload.nod_id,
            parametros=payload.parametros,
            horizonte=payload.horizonte,
        )
    except MLServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.get("/predicciones", response_model=List[PrediccionLecturaResponse])
def get_predicciones(
    nod_id: Optional[int] = Query(None, description="Filtrar por ID de nodo"),
    parametro: Optional[str] = Query(
        None, description="Código de parámetro (PH, TEMPERATURA, ...)"
    ),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    stmt = select(PrediccionLecturaModel)
    if nod_id is not None:
        stmt = stmt.where(PrediccionLecturaModel.pre_nod_id == nod_id)
    if parametro:
        stmt = stmt.where(
            PrediccionLecturaModel.pre_parametro == parametro.strip().upper()
        )
    stmt = stmt.order_by(
        PrediccionLecturaModel.pre_fecha_objetivo.asc().nullslast()
    ).limit(limit)
    return db.scalars(stmt).all()
