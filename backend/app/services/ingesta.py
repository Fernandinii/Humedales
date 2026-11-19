from datetime import datetime, timezone
from uuid import uuid4
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.humedal import LecturaModel, NodoModel
from app.models.sensor import SensorModel, SensorParametroModel
from app.models.sistema import AlertaModel, DetalleLecturaModel, ParametroModel


COLUMNA_POR_CODIGO = {
    "PH": "lec_ph",
    "TEMPERATURA": "lec_temperatura",
    "TURBIDEZ": "lec_turbidez",
    "TDS": "lec_tds_ppm",
    "CONDUCTIVIDAD": "lec_conductividad_us_cm",
}

ALIAS_CODIGOS = {
    "PH_AGUA": "PH",
    "TEMPERATURA_C": "TEMPERATURA",
    "TEMPERATURA_AGUA": "TEMPERATURA",
    "TURBIDEZ_NTU": "TURBIDEZ",
    "TDS_PPM": "TDS",
    "CONDUCTIVIDAD_US_CM": "CONDUCTIVIDAD",
    "CONDUCTIVIDAD_ELECTRICA": "CONDUCTIVIDAD",
}


class NodoNoEncontradoError(Exception):
    pass


class LecturaInvalidaError(Exception):
    pass


def _normalizar_codigo(codigo: str) -> str:
    return codigo.strip().upper().replace(" ", "_").replace("-", "_")


def _severidad_fuera_rango(valor: float, minimo: float | None, maximo: float | None) -> str | None:
    exceso = 0.0
    if minimo is not None and valor < minimo:
        exceso = (minimo - valor) / max(abs(minimo), 1e-9)
    elif maximo is not None and valor > maximo:
        exceso = (valor - maximo) / max(abs(maximo), 1e-9)
    else:
        return None
    return "critica" if exceso >= 0.15 else "alta"


def registrar_ingesta(
    db: Session,
    nodo_codigo: str,
    lecturas: dict[str, Any],
    fecha_hora: datetime | None = None,
) -> dict[str, Any]:
    codigo_nodo = nodo_codigo.strip()
    if not codigo_nodo:
        raise NodoNoEncontradoError("El código de nodo es obligatorio")

    nodo = db.scalars(
        select(NodoModel).where(func.upper(func.trim(NodoModel.nod_codigo)) == codigo_nodo.upper())
    ).first()
    if nodo is None:
        raise NodoNoEncontradoError(f"No existe un nodo con código '{nodo_codigo}'")

    valores: dict[str, float] = {}
    for codigo_original, valor in lecturas.items():
        if valor is None:
            continue
        codigo = _normalizar_codigo(str(codigo_original))
        codigo = ALIAS_CODIGOS.get(codigo, codigo)
        try:
            valores[codigo] = float(valor)
        except (TypeError, ValueError) as exc:
            raise LecturaInvalidaError(
                f"El valor de '{codigo_original}' no es numérico: {valor!r}"
            ) from exc

    if not valores:
        raise LecturaInvalidaError("Debe enviar al menos una lectura con valor numérico")

    parametros = db.scalars(
        select(ParametroModel).where(func.upper(ParametroModel.par_codigo).in_(list(valores.keys())))
    ).all()
    parametros_por_codigo = {_normalizar_codigo(p.par_codigo): p for p in parametros}

    sensores_activos = db.execute(
        select(SensorParametroModel, ParametroModel)
        .join(ParametroModel, SensorParametroModel.senpar_par_id == ParametroModel.par_id)
        .join(SensorModel, SensorParametroModel.senpar_sen_id == SensorModel.sen_id)
        .where(
            SensorModel.sen_nod_id == nodo.nod_id,
            SensorModel.sen_activo.is_(True),
            SensorParametroModel.senpar_activo.is_(True),
        )
    ).all()
    sensores_por_codigo: dict[str, tuple[SensorParametroModel, ParametroModel]] = {}
    for senpar, parametro_sensor in sensores_activos:
        sensores_por_codigo.setdefault(
            _normalizar_codigo(parametro_sensor.par_codigo),
            (senpar, parametro_sensor),
        )

    if not parametros_por_codigo:
        raise LecturaInvalidaError(
            "Ninguno de los códigos enviados existe en el catálogo de parámetros"
        )

    ignorados = sorted(codigo for codigo in valores if codigo not in parametros_por_codigo)
    valores_validos = {
        codigo: valor for codigo, valor in valores.items() if codigo in parametros_por_codigo
    }

    ahora = datetime.now(timezone.utc)
    lectura = LecturaModel(
        lec_nod_id=nodo.nod_id,
        lec_fecha_hora=fecha_hora or ahora,
        lec_recibido_at=ahora,
        lec_id_paquete=f"ing-{uuid4().hex[:12]}",
    )

    for codigo, valor in valores_validos.items():
        columna = COLUMNA_POR_CODIGO.get(codigo)
        if columna:
            setattr(lectura, columna, valor)

    try:
        db.add(lectura)
        db.flush()
        lec_id = int(lectura.lec_id)
        lectura.lec_secuencia = lec_id

        detalles_insertados = 0
        alertas_generadas: list[str] = []

        for codigo, valor in valores_validos.items():
            parametro = parametros_por_codigo[codigo]
            sensor_link = sensores_por_codigo.get(codigo)

            if sensor_link and sensor_link[0].senpar_minimo is not None:
                minimo = float(sensor_link[0].senpar_minimo)
            else:
                minimo = (
                    float(parametro.par_minimo)
                    if parametro.par_minimo is not None
                    else None
                )

            if sensor_link and sensor_link[0].senpar_maximo is not None:
                maximo = float(sensor_link[0].senpar_maximo)
            else:
                maximo = (
                    float(parametro.par_maximo)
                    if parametro.par_maximo is not None
                    else None
                )

            severidad = _severidad_fuera_rango(valor, minimo, maximo)
            unidad = (
                sensor_link[0].senpar_unidad
                if sensor_link
                else parametro.par_unidad_ref
            )

            db.add(
                DetalleLecturaModel(
                    det_lec_id=lec_id,
                    det_par_id=parametro.par_id,
                    det_senpar_id=sensor_link[0].senpar_id if sensor_link else None,
                    det_valor_num=valor,
                    det_unidad=unidad,
                    det_valor_original=str(valor),
                    det_estado="fuera_rango" if severidad else "valido",
                    det_creado_at=ahora,
                )
            )
            detalles_insertados += 1

            if severidad:
                unidad = unidad or ""
                rango = " / ".join(
                    [
                        f"mín {minimo}" if minimo is not None else "sin mínimo",
                        f"máx {maximo}" if maximo is not None else "sin máximo",
                    ]
                )
                titulo = f"{parametro.par_nombre} fuera de rango"
                db.add(
                    AlertaModel(
                        ale_nod_id=nodo.nod_id,
                        ale_lectura_id=lec_id,
                        ale_tipo="fuera_de_rango",
                        ale_severidad=severidad,
                        ale_titulo=titulo,
                        ale_descripcion=(
                            f"El nodo {nodo.nod_codigo} reportó {valor} {unidad} para "
                            f"{parametro.par_nombre}. Rango permitido: {rango}."
                        ),
                        ale_generada_at=ahora,
                        ale_estado="pendiente",
                    )
                )
                alertas_generadas.append(titulo)

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "lectura_id": lec_id,
        "nodo_id": int(nodo.nod_id),
        "nodo_codigo": nodo.nod_codigo,
        "detalles_insertados": detalles_insertados,
        "alertas_generadas": len(alertas_generadas),
        "parametros_ignorados": ignorados,
        "alertas": alertas_generadas,
    }
