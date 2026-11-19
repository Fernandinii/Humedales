from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.auth import require_roles
from app.core.database import get_db
from app.core.security import hash_password
from app.models.humedal import ContenedorModel, HumedalModel, NodoModel
from app.models.sensor import SensorModel, SensorParametroModel
from app.models.sistema import ParametroModel, RolModel, UsuarioModel
from app.schemas.humedal import (
    ContenedorCreate,
    ContenedorResponse,
    ContenedorUpdate,
    HumedalCreate,
    HumedalResponse,
    HumedalUpdate,
    NodoCreate,
    NodoResponse,
    NodoUpdate,
)
from app.schemas.sensor import (
    SensorCreate,
    SensorParametroCreate,
    SensorParametroResponse,
    SensorParametroUpdate,
    SensorResponse,
    SensorUpdate,
)
from app.schemas.sistema import (
    ParametroResponse,
    ParametroUpdate,
    RolResponse,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

router = APIRouter(tags=["Administración"])

require_infra = require_roles(["Administrador", "Investigador"])
require_admin = require_roles(["Administrador"])


def _get_or_404(db: Session, model, id_value: int, label: str):
    obj = db.get(model, id_value)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{label} no encontrado",
        )
    return obj


def _commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La operación viola una restricción de integridad de la base de datos",
        ) from exc


# --------------------------------------------------------------------------- #
# Humedales
# --------------------------------------------------------------------------- #
@router.post(
    "/humedales",
    response_model=HumedalResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Humedales"],
)
def create_humedal(
    payload: HumedalCreate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    humedal = HumedalModel(
        **payload.model_dump(),
        hum_creado_at=datetime.now(timezone.utc),
    )
    db.add(humedal)
    _commit(db)
    db.refresh(humedal)
    return humedal


@router.patch(
    "/humedales/{hum_id}",
    response_model=HumedalResponse,
    tags=["Humedales"],
)
def update_humedal(
    hum_id: int,
    payload: HumedalUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    humedal = _get_or_404(db, HumedalModel, hum_id, "Humedal")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(humedal, field, value)
    _commit(db)
    db.refresh(humedal)
    return humedal


# --------------------------------------------------------------------------- #
# Contenedores
# --------------------------------------------------------------------------- #
@router.post(
    "/contenedores",
    response_model=ContenedorResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Contenedores"],
)
def create_contenedor(
    payload: ContenedorCreate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    _get_or_404(db, HumedalModel, payload.con_hum_id, "Humedal")
    contenedor = ContenedorModel(
        **payload.model_dump(),
        con_creado_at=datetime.now(timezone.utc),
    )
    db.add(contenedor)
    _commit(db)
    db.refresh(contenedor)
    return contenedor


@router.patch(
    "/contenedores/{con_id}",
    response_model=ContenedorResponse,
    tags=["Contenedores"],
)
def update_contenedor(
    con_id: int,
    payload: ContenedorUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    contenedor = _get_or_404(db, ContenedorModel, con_id, "Contenedor")
    data = payload.model_dump(exclude_unset=True)
    if data.get("con_hum_id") is not None:
        _get_or_404(db, HumedalModel, data["con_hum_id"], "Humedal")
    for field, value in data.items():
        setattr(contenedor, field, value)
    _commit(db)
    db.refresh(contenedor)
    return contenedor


# --------------------------------------------------------------------------- #
# Nodos
# --------------------------------------------------------------------------- #
@router.post(
    "/nodos",
    response_model=NodoResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Nodos"],
)
def create_nodo(
    payload: NodoCreate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    _get_or_404(db, HumedalModel, payload.nod_hum_id, "Humedal")
    if payload.nod_con_id is not None:
        _get_or_404(db, ContenedorModel, payload.nod_con_id, "Contenedor")
    nodo = NodoModel(
        **payload.model_dump(),
        nod_creado_at=datetime.now(timezone.utc),
    )
    db.add(nodo)
    _commit(db)
    db.refresh(nodo)
    return nodo


@router.patch(
    "/nodos/{nod_id}",
    response_model=NodoResponse,
    tags=["Nodos"],
)
def update_nodo(
    nod_id: int,
    payload: NodoUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    nodo = _get_or_404(db, NodoModel, nod_id, "Nodo")
    data = payload.model_dump(exclude_unset=True)
    if data.get("nod_hum_id") is not None:
        _get_or_404(db, HumedalModel, data["nod_hum_id"], "Humedal")
    if data.get("nod_con_id") is not None:
        _get_or_404(db, ContenedorModel, data["nod_con_id"], "Contenedor")
    for field, value in data.items():
        setattr(nodo, field, value)
    _commit(db)
    db.refresh(nodo)
    return nodo


# --------------------------------------------------------------------------- #
# Sensores
# --------------------------------------------------------------------------- #
@router.get("/sensores", response_model=List[SensorResponse], tags=["Sensores"])
def get_sensores(
    nod_id: Optional[int] = Query(None, description="Filtrar por ID de nodo"),
    db: Session = Depends(get_db),
):
    stmt = select(SensorModel)
    if nod_id is not None:
        stmt = stmt.where(SensorModel.sen_nod_id == nod_id)
    stmt = stmt.order_by(SensorModel.sen_id)
    return db.scalars(stmt).all()


@router.post(
    "/sensores",
    response_model=SensorResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sensores"],
)
def create_sensor(
    payload: SensorCreate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    _get_or_404(db, NodoModel, payload.sen_nod_id, "Nodo")
    sensor = SensorModel(**payload.model_dump())
    db.add(sensor)
    _commit(db)
    db.refresh(sensor)
    return sensor


@router.patch(
    "/sensores/{sen_id}",
    response_model=SensorResponse,
    tags=["Sensores"],
)
def update_sensor(
    sen_id: int,
    payload: SensorUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    sensor = _get_or_404(db, SensorModel, sen_id, "Sensor")
    data = payload.model_dump(exclude_unset=True)
    if data.get("sen_nod_id") is not None:
        _get_or_404(db, NodoModel, data["sen_nod_id"], "Nodo")
    for field, value in data.items():
        setattr(sensor, field, value)
    _commit(db)
    db.refresh(sensor)
    return sensor


@router.get(
    "/sensores/{sen_id}/parametros",
    response_model=List[SensorParametroResponse],
    tags=["Sensores"],
)
def get_sensor_parametros(sen_id: int, db: Session = Depends(get_db)):
    _get_or_404(db, SensorModel, sen_id, "Sensor")
    stmt = (
        select(SensorParametroModel)
        .where(SensorParametroModel.senpar_sen_id == sen_id)
        .order_by(SensorParametroModel.senpar_id)
    )
    return db.scalars(stmt).all()


@router.post(
    "/sensores/{sen_id}/parametros",
    response_model=SensorParametroResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Sensores"],
)
def create_sensor_parametro(
    sen_id: int,
    payload: SensorParametroCreate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    _get_or_404(db, SensorModel, sen_id, "Sensor")
    _get_or_404(db, ParametroModel, payload.senpar_par_id, "Parámetro")
    link = SensorParametroModel(
        senpar_sen_id=sen_id,
        **payload.model_dump(),
    )
    db.add(link)
    _commit(db)
    db.refresh(link)
    return link


@router.patch(
    "/sensores/{sen_id}/parametros/{senpar_id}",
    response_model=SensorParametroResponse,
    tags=["Sensores"],
)
def update_sensor_parametro(
    sen_id: int,
    senpar_id: int,
    payload: SensorParametroUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    _get_or_404(db, SensorModel, sen_id, "Sensor")
    link = _get_or_404(db, SensorParametroModel, senpar_id, "Vínculo sensor-parámetro")
    if link.senpar_sen_id != sen_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El vínculo no pertenece al sensor indicado",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(link, field, value)
    _commit(db)
    db.refresh(link)
    return link


# --------------------------------------------------------------------------- #
# Parámetros
# --------------------------------------------------------------------------- #
@router.patch(
    "/parametros/{par_id}",
    response_model=ParametroResponse,
    tags=["Parámetros"],
)
def update_parametro(
    par_id: int,
    payload: ParametroUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_infra),
):
    parametro = _get_or_404(db, ParametroModel, par_id, "Parámetro")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(parametro, field, value)
    _commit(db)
    db.refresh(parametro)
    return parametro


# --------------------------------------------------------------------------- #
# Usuarios y roles (solo Administrador)
# --------------------------------------------------------------------------- #
@router.get("/roles", response_model=List[RolResponse], tags=["Usuarios"])
def get_roles(
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_admin),
):
    return db.scalars(select(RolModel).order_by(RolModel.rol_id)).all()


@router.get("/usuarios", response_model=List[UsuarioResponse], tags=["Usuarios"])
def get_usuarios(
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_admin),
):
    return db.scalars(select(UsuarioModel).order_by(UsuarioModel.usr_id)).all()


@router.post(
    "/usuarios",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Usuarios"],
)
def create_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_admin),
):
    correo = payload.usr_correo.strip().lower()
    existing = db.scalars(
        select(UsuarioModel).where(func.lower(UsuarioModel.usr_correo) == correo)
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo",
        )

    _get_or_404(db, RolModel, payload.usr_rol_id, "Rol")
    usuario = UsuarioModel(
        usr_rol_id=payload.usr_rol_id,
        usr_nombre=payload.usr_nombre,
        usr_apellido=payload.usr_apellido,
        usr_correo=correo,
        usr_password_hash=hash_password(payload.usr_password),
        usr_activo=payload.usr_activo,
        usr_creado_at=datetime.now(timezone.utc),
    )
    db.add(usuario)
    _commit(db)
    db.refresh(usuario)
    return usuario


@router.patch(
    "/usuarios/{usr_id}",
    response_model=UsuarioResponse,
    tags=["Usuarios"],
)
def update_usuario(
    usr_id: int,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: UsuarioModel = Depends(require_admin),
):
    usuario = _get_or_404(db, UsuarioModel, usr_id, "Usuario")
    data = payload.model_dump(exclude_unset=True)
    password = data.pop("usr_password", None)

    if data.get("usr_rol_id") is not None:
        _get_or_404(db, RolModel, data["usr_rol_id"], "Rol")
    else:
        data.pop("usr_rol_id", None)

    for field, value in data.items():
        setattr(usuario, field, value)

    if password:
        usuario.usr_password_hash = hash_password(password)

    _commit(db)
    db.refresh(usuario)
    return usuario
