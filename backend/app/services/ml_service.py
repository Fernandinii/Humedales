"""Motor de entrenamiento y predicción para las series histórico de humedales.

El servicio lee las series históricas de ``detalle_lectura`` + ``lectura`` por
nodo y parámetro, entrena un modelo de regresión temporal (Ridge sobre
características de rezago), serializa el artefacto y registra las proyecciones
en ``prediccion_lectura``.  Si alguna proyección queda fuera de los rangos
configurados del parámetro se genera una alerta preventiva.

El diseño es tolerante a series muy cortas: con menos de dos lecturas el
parámetro se omite y, cuando no hay suficientes filas para construir rezagos,
se cae a un modelo de tendencia temporal simple.
"""

from __future__ import annotations

import math
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median
from typing import Any

import joblib
import numpy as np
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.humedal import LecturaModel, NodoModel
from app.models.ml import ModeloMLModel, PrediccionLecturaModel
from app.models.sistema import AlertaModel, DetalleLecturaModel, ParametroModel

BACKEND_DIR = Path(__file__).resolve().parents[2]
ML_MODELS_DIR = BACKEND_DIR / "ml_models"
ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)

PARAMETROS_POR_DEFECTO = ["PH", "TEMPERATURA", "TURBIDEZ", "TDS", "CONDUCTIVIDAD"]
ALGORITMO_LAG = "Ridge (regresión con rezagos temporales)"
ALGORITMO_TENDENCIA = "Ridge (tendencia temporal)"

INTERVALO_MINIMO_SEGUNDOS = 60
INTERVALO_MAXIMO_SEGUNDOS = 7 * 24 * 60 * 60


class MLServiceError(Exception):
    """Error controlado del servicio de analítica predictiva."""


def _normalizar_codigo(codigo: str) -> str:
    return codigo.strip().upper().replace(" ", "_").replace("-", "_")


def _nombre_modelo(nodo_codigo: str, parametro_codigo: str) -> str:
    base = re.sub(r"[^A-Za-z0-9_-]+", "_", f"{nodo_codigo}_{parametro_codigo}")
    return f"pred_{base}"[:150]


def _severidad_fuera_rango(
    valor: float, minimo: float | None, maximo: float | None
) -> str | None:
    exceso = 0.0
    if minimo is not None and valor < minimo:
        exceso = (minimo - valor) / max(abs(minimo), 1e-9)
    elif maximo is not None and valor > maximo:
        exceso = (valor - maximo) / max(abs(maximo), 1e-9)
    else:
        return None
    return "critica" if exceso >= 0.15 else "alta"


def _leer_serie(
    db: Session, nodo_id: int, parametro: ParametroModel
) -> list[tuple[datetime, float, int]]:
    columna_fecha = func.coalesce(
        LecturaModel.lec_fecha_hora, DetalleLecturaModel.det_creado_at
    )
    stmt = (
        select(
            columna_fecha.label("fecha"),
            DetalleLecturaModel.det_valor_num,
            DetalleLecturaModel.det_estado,
            LecturaModel.lec_id,
        )
        .join(LecturaModel, DetalleLecturaModel.det_lec_id == LecturaModel.lec_id)
        .where(
            LecturaModel.lec_nod_id == nodo_id,
            DetalleLecturaModel.det_par_id == parametro.par_id,
            DetalleLecturaModel.det_valor_num.isnot(None),
        )
        .order_by(columna_fecha.asc())
    )

    serie: list[tuple[datetime, float, int]] = []
    for fecha, valor, estado, lec_id in db.execute(stmt).all():
        if valor is None:
            continue
        if estado and estado not in ("valido", "ok", "fuera_rango"):
            continue
        if fecha is None:
            continue
        if fecha.tzinfo is None:
            fecha = fecha.replace(tzinfo=timezone.utc)
        serie.append((fecha, float(valor), int(lec_id)))
    return serie


def _estimar_intervalo(fechas: list[datetime]) -> int:
    diferencias = [
        (fechas[i] - fechas[i - 1]).total_seconds()
        for i in range(1, len(fechas))
        if (fechas[i] - fechas[i - 1]).total_seconds() > 0
    ]
    intervalo = median(diferencias) if diferencias else 3600
    return int(
        max(INTERVALO_MINIMO_SEGUNDOS, min(intervalo, INTERVALO_MAXIMO_SEGUNDOS))
    )


def _entrenar_modelo(
    valores: list[float],
) -> tuple[Any, str, int, float, list[datetime] | None]:
    """Entrena un Ridge y devuelve (modelo, estrategia, n_lags, r2, t0)."""
    n = len(valores)
    if n < 2:
        raise MLServiceError("Se requieren al menos 2 lecturas históricas")

    n_lags = 3 if n >= 12 else 2 if n >= 6 else 1
    filas = n - n_lags

    if filas >= 2:
        x = np.array(
            [[valores[i - j] for j in range(1, n_lags + 1)] for i in range(n_lags, n)],
            dtype=float,
        )
        y = np.array(valores[n_lags:], dtype=float)
        modelo = _nuevo_ridge().fit(x, y)
        r2 = float(modelo.score(x, y)) if len(y) >= 2 else 0.0
        return modelo, "lag", n_lags, r2, None

    from sklearn.linear_model import Ridge

    t0 = datetime.now(timezone.utc)
    x = np.arange(n, dtype=float).reshape(-1, 1)
    y = np.array(valores, dtype=float)
    modelo = Ridge(alpha=1.0).fit(x, y)
    r2 = float(modelo.score(x, y)) if len(y) >= 2 else 0.0
    return modelo, "tiempo", n_lags, r2, t0


def _nuevo_ridge():
    from sklearn.linear_model import Ridge

    return Ridge(alpha=1.0)


def _limites_historicos(valores: list[float]) -> tuple[float, float]:
    arreglo = np.array(valores, dtype=float)
    desviacion = float(np.std(arreglo))
    if desviacion <= 0:
        desviacion = max(abs(float(np.mean(arreglo))) * 0.01, 0.01)
    return float(np.min(arreglo) - 3 * desviacion), float(np.max(arreglo) + 3 * desviacion)


def _confianza(n_muestras: int, r2: float, paso: int) -> float:
    calidad = min(1.0, max(0.0, r2)) if math.isfinite(r2) else 0.0
    suficiencia = min(1.0, n_muestras / 24.0)
    base = 0.25 + 0.45 * calidad + 0.30 * suficiencia
    decadencia = 0.985 ** paso
    return round(max(0.05, min(0.99, base * decadencia)), 4)


def _proyectar(
    modelo: Any,
    estrategia: str,
    n_lags: int,
    nombres: list[float],
    fechas: list[datetime],
    intervalo: int,
    horizonte: int,
    r2: float,
) -> list[dict[str, Any]]:
    historial = list(nombres)
    ultima_fecha = fechas[-1]
    minimo, maximo = _limites_historicos(nombres)
    proyecciones: list[dict[str, Any]] = []

    for paso in range(1, horizonte + 1):
        if estrategia == "lag":
            caracteristicas = np.array(
                [[historial[-j] for j in range(1, n_lags + 1)]], dtype=float
            )
        else:
            offset = len(nombres) - 1 + paso
            caracteristicas = np.array([[offset]], dtype=float)

        valor = float(modelo.predict(caracteristicas)[0])
        valor = min(max(valor, minimo), maximo)
        historial.append(valor)

        proyecciones.append(
            {
                "fecha": ultima_fecha + timedelta(seconds=intervalo * paso),
                "valor": round(valor, 5),
                "confianza": _confianza(len(nombres), r2, paso),
            }
        )

    return proyecciones


def _registrar_modelo(
    db: Session,
    nodo: NodoModel,
    parametro: ParametroModel,
    estrategia: str,
    r2: float,
    n_muestras: int,
    version: str,
    ahora: datetime,
) -> tuple[ModeloMLModel, Path]:
    nombre = _nombre_modelo(nodo.nod_codigo or f"nodo{nodo.nod_id}", parametro.par_codigo)
    ruta = ML_MODELS_DIR / f"{nombre}.joblib"
    algoritmo = ALGORITMO_LAG if estrategia == "lag" else ALGORITMO_TENDENCIA
    descripcion = (
        f"Proyección de {parametro.par_nombre} para el nodo "
        f"{nodo.nod_codigo or nodo.nod_id}. Entrenado con {n_muestras} lecturas "
        f"históricas, R²={r2:.3f}."
    )

    modelo = db.scalars(
        select(ModeloMLModel)
        .where(ModeloMLModel.mod_nombre == nombre)
        .order_by(ModeloMLModel.mod_id.desc())
    ).first()

    if modelo is None:
        modelo = ModeloMLModel(
            mod_nombre=nombre,
            mod_version=version,
            mod_descripcion=descripcion,
            mod_algoritmo=algoritmo,
            mod_ruta_archivo=str(ruta.relative_to(BACKEND_DIR)).replace("\\", "/"),
            mod_entrenado_at=ahora,
            mod_activo=True,
            mod_creado_at=ahora,
        )
        db.add(modelo)
    else:
        modelo.mod_version = version
        modelo.mod_descripcion = descripcion
        modelo.mod_algoritmo = algoritmo
        modelo.mod_ruta_archivo = str(ruta.relative_to(BACKEND_DIR)).replace("\\", "/")
        modelo.mod_entrenado_at = ahora
        modelo.mod_activo = True

    db.flush()
    return modelo, ruta


def _entrenar_parametro(
    db: Session,
    nodo: NodoModel,
    parametro: ParametroModel,
    horizonte: int,
    ahora: datetime,
) -> dict[str, Any]:
    codigo = _normalizar_codigo(parametro.par_codigo)
    serie = _leer_serie(db, int(nodo.nod_id), parametro)

    if len(serie) < 2:
        return {
            "parametro": codigo,
            "parametro_nombre": parametro.par_nombre,
            "estado": "omitido",
            "mensaje": (
                "Se requieren al menos 2 lecturas históricas para entrenar "
                f"(disponibles: {len(serie)})."
            ),
            "predicciones": 0,
            "alertas": 0,
        }

    fechas = [item[0] for item in serie]
    valores = [item[1] for item in serie]
    referencia = serie[-1][2]
    intervalo = _estimar_intervalo(fechas)

    modelo_sk, estrategia, n_lags, r2, _ = _entrenar_modelo(valores)
    proyecciones = _proyectar(
        modelo_sk,
        estrategia,
        n_lags,
        valores,
        fechas,
        intervalo,
        horizonte,
        r2,
    )

    version = "v" + ahora.strftime("%Y%m%d%H%M%S")
    modelo, ruta = _registrar_modelo(
        db,
        nodo,
        parametro,
        estrategia,
        r2,
        len(serie),
        version,
        ahora,
    )

    joblib.dump(
        {
            "modelo": modelo_sk,
            "estrategia": estrategia,
            "n_lags": n_lags,
            "parametro": codigo,
            "unidad": parametro.par_unidad_ref,
            "nodo_id": int(nodo.nod_id),
            "nodo_codigo": nodo.nod_codigo,
            "version": version,
            "r2": r2,
            "intervalo_segundos": intervalo,
            "ultima_fecha": fechas[-1].isoformat(),
            "ultimos_valores": valores[-max(n_lags, 1) :],
        },
        ruta,
    )

    # Se reemplazan las predicciones previas del mismo nodo/parámetro para que
    # la vista siempre muestre la proyección más reciente.
    db.execute(
        delete(PrediccionLecturaModel).where(
            PrediccionLecturaModel.pre_nod_id == nodo.nod_id,
            PrediccionLecturaModel.pre_parametro == codigo,
        )
    )

    unidad = parametro.par_unidad_ref
    minimo = float(parametro.par_minimo) if parametro.par_minimo is not None else None
    maximo = float(parametro.par_maximo) if parametro.par_maximo is not None else None

    fuera_de_rango: list[tuple[dict[str, Any], str]] = []
    for proyeccion in proyecciones:
        db.add(
            PrediccionLecturaModel(
                pre_nod_id=nodo.nod_id,
                pre_mod_id=modelo.mod_id,
                pre_lectura_ref_id=referencia,
                pre_parametro=codigo,
                pre_valor_predicho=proyeccion["valor"],
                pre_unidad=unidad,
                pre_fecha_objetivo=proyeccion["fecha"],
                pre_generado_at=ahora,
                pre_confianza=proyeccion["confianza"],
            )
        )
        severidad = _severidad_fuera_rango(proyeccion["valor"], minimo, maximo)
        if severidad is not None:
            fuera_de_rango.append((proyeccion, severidad))

    alertas = 0
    if fuera_de_rango:
        # Evita duplicar alertas preventivas pendientes al reentrenar.
        db.execute(
            delete(AlertaModel).where(
                AlertaModel.ale_nod_id == nodo.nod_id,
                AlertaModel.ale_tipo == "prediccion_fuera_rango",
                AlertaModel.ale_estado == "pendiente",
                AlertaModel.ale_descripcion.ilike(f"%{parametro.par_nombre}%"),
            )
        )

        primero, severidad = fuera_de_rango[0]
        severidad = "critica" if any(s == "critica" for _, s in fuera_de_rango) else severidad
        rango_texto = " / ".join(
            [
                f"mín {minimo}" if minimo is not None else "sin mínimo",
                f"máx {maximo}" if maximo is not None else "sin máximo",
            ]
        )
        unidad_texto = f" {unidad}" if unidad else ""
        db.add(
            AlertaModel(
                ale_nod_id=nodo.nod_id,
                ale_lectura_id=referencia,
                ale_tipo="prediccion_fuera_rango",
                ale_severidad=severidad,
                ale_titulo=f"Predicción fuera de rango: {parametro.par_nombre}",
                ale_descripcion=(
                    f"El modelo proyecta {primero['valor']}{unidad_texto} para "
                    f"{parametro.par_nombre} en el nodo {nodo.nod_codigo} hacia "
                    f"{primero['fecha'].isoformat()}. Rango permitido: {rango_texto}. "
                    f"Intervalos proyectados fuera de rango: {len(fuera_de_rango)} "
                    f"de {len(proyecciones)}."
                ),
                ale_generada_at=ahora,
                ale_estado="pendiente",
            )
        )
        alertas = 1

    confianza_promedio = round(
        sum(p["confianza"] for p in proyecciones) / len(proyecciones), 4
    )

    return {
        "parametro": codigo,
        "parametro_nombre": parametro.par_nombre,
        "estado": "entrenado",
        "mensaje": (
            f"Modelo {estrategia} con {len(serie)} lecturas. "
            f"R²={r2:.3f}, intervalo estimado {intervalo}s."
        ),
        "modelo_id": int(modelo.mod_id),
        "modelo_nombre": modelo.mod_nombre,
        "modelo_version": modelo.mod_version,
        "algoritmo": modelo.mod_algoritmo,
        "r2": round(r2, 4),
        "intervalo_segundos": intervalo,
        "predicciones": len(proyecciones),
        "alertas": alertas,
        "confianza_promedio": confianza_promedio,
    }


def entrenar_y_predecir(
    db: Session,
    nodo_id: int,
    parametros: list[str] | None = None,
    horizonte: int = 12,
) -> dict[str, Any]:
    """Entrena un modelo por parámetro y guarda sus proyecciones futuras."""

    nodo = db.get(NodoModel, nodo_id)
    if nodo is None:
        raise MLServiceError(f"No existe un nodo con ID {nodo_id}")

    codigos = [_normalizar_codigo(c) for c in (parametros or PARAMETROS_POR_DEFECTO)]
    codigos = list(dict.fromkeys(codigos))

    parametros_db = db.scalars(
        select(ParametroModel).where(
            func.upper(ParametroModel.par_codigo).in_(codigos),
            ParametroModel.par_activo.is_(True),
        )
    ).all()
    por_codigo = {
        _normalizar_codigo(p.par_codigo): p for p in parametros_db
    }

    ahora = datetime.now(timezone.utc)
    resultados: list[dict[str, Any]] = []

    for codigo in codigos:
        parametro = por_codigo.get(codigo)
        if parametro is None:
            resultados.append(
                {
                    "parametro": codigo,
                    "estado": "omitido",
                    "mensaje": "El parámetro no existe o no está activo.",
                    "predicciones": 0,
                    "alertas": 0,
                }
            )
            continue

        try:
            with db.begin_nested():
                resultados.append(
                    _entrenar_parametro(db, nodo, parametro, horizonte, ahora)
                )
        except Exception as exc:  # noqa: BLE001 - se reporta por parámetro
            resultados.append(
                {
                    "parametro": codigo,
                    "parametro_nombre": parametro.par_nombre,
                    "estado": "error",
                    "mensaje": f"No se pudo entrenar el modelo: {exc}",
                    "predicciones": 0,
                    "alertas": 0,
                }
            )

    db.commit()

    entrenados = [r for r in resultados if r.get("estado") == "entrenado"]
    return {
        "nodo_id": int(nodo.nod_id),
        "nodo_codigo": nodo.nod_codigo,
        "modelos_entrenados": len(entrenados),
        "predicciones_generadas": sum(r.get("predicciones", 0) for r in entrenados),
        "alertas_generadas": sum(r.get("alertas", 0) for r in entrenados),
        "resultados": resultados,
    }
