#!/usr/bin/env python3
"""Simulador IoT para el sistema Humedales Web.

Genera lecturas realistas cada 5 segundos y las envía al endpoint de ingesta
(`POST /api/v1/lecturas/ingesta`) o directamente a la base de datos con `--direct`.

Uso:
    python scripts/simulador_iot.py                 # envía por HTTP al backend
    python scripts/simulador_iot.py --direct        # inserta directo en PostgreSQL
    python scripts/simulador_iot.py --once          # genera una sola lectura
    python scripts/simulador_iot.py --interval 5    # intervalo en segundos
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

try:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.humedal import ContenedorModel, HumedalModel, NodoModel
from app.models.sistema import ParametroModel
from app.services.ingesta import registrar_ingesta


HUMEDAL_NOMBRE = "Humedal Demostración ITVH"
HUMEDAL_DESCRIPCION = "Humedal artificial de prueba para validación de telemetría IoT."
HUMEDAL_UBICACION = "ITVH - Laboratorio Ambiental"
CONTENEDOR_CODIGO = "CONT-DEMO-01"
CONTENEDOR_NOMBRE = "Estanque de Prueba"
NODO_CODIGO = "NODO-DEMO-01"
NODO_NOMBRE = "Nodo de Monitoreo Demostración"

PARAMETROS = {
    "PH": {
        "base": 7.2,
        "amplitud": 0.35,
        "periodo": 900,
        "ruido": 0.07,
        "minimo": 6.5,
        "maximo": 8.5,
        "digitos": 2,
    },
    "TEMPERATURA": {
        "base": 25.5,
        "amplitud": 1.4,
        "periodo": 1800,
        "ruido": 0.25,
        "minimo": 18.0,
        "maximo": 30.0,
        "digitos": 1,
    },
    "TURBIDEZ": {
        "base": 10.0,
        "amplitud": 2.5,
        "periodo": 1200,
        "ruido": 0.7,
        "minimo": 0.0,
        "maximo": 25.0,
        "digitos": 1,
    },
    "TDS": {
        "base": 310.0,
        "amplitud": 35.0,
        "periodo": 2400,
        "ruido": 5.0,
        "minimo": 100.0,
        "maximo": 500.0,
        "digitos": 0,
    },
    "CONDUCTIVIDAD": {
        "base": 520.0,
        "amplitud": 55.0,
        "periodo": 2400,
        "ruido": 8.0,
        "minimo": 150.0,
        "maximo": 900.0,
        "digitos": 0,
    },
}

FASES = {codigo: random.uniform(0, 2 * math.pi) for codigo in PARAMETROS}


def asegurar_estructura() -> str:
    """Crea humedal, contenedor, nodo y rangos de parámetros si no existen."""
    db = SessionLocal()
    try:
        humedal = db.scalars(
            select(HumedalModel).where(HumedalModel.hum_nombre == HUMEDAL_NOMBRE)
        ).first()
        if humedal is None:
            humedal = HumedalModel(
                hum_nombre=HUMEDAL_NOMBRE,
                hum_descripcion=HUMEDAL_DESCRIPCION,
                hum_ubicacion=HUMEDAL_UBICACION,
                hum_latitud=19.4326,
                hum_longitud=-99.1332,
                hum_activo=True,
                hum_creado_at=datetime.now(timezone.utc),
            )
            db.add(humedal)
            db.flush()
            print(f"[seed] Humedal creado: {humedal.hum_nombre} (id={humedal.hum_id})")

        contenedor = db.scalars(
            select(ContenedorModel).where(ContenedorModel.con_codigo == CONTENEDOR_CODIGO)
        ).first()
        if contenedor is None:
            contenedor = ContenedorModel(
                con_hum_id=humedal.hum_id,
                con_codigo=CONTENEDOR_CODIGO,
                con_nombre=CONTENEDOR_NOMBRE,
                con_descripcion="Contenedor de pruebas con sensores físico-químicos.",
                con_orden=1,
                con_activo=True,
                con_creado_at=datetime.now(timezone.utc),
            )
            db.add(contenedor)
            db.flush()
            print(f"[seed] Contenedor creado: {contenedor.con_nombre} (id={contenedor.con_id})")

        nodo = db.scalars(
            select(NodoModel).where(func.upper(NodoModel.nod_codigo) == NODO_CODIGO)
        ).first()
        if nodo is None:
            nodo = NodoModel(
                nod_hum_id=humedal.hum_id,
                nod_con_id=contenedor.con_id,
                nod_nombre=NODO_NOMBRE,
                nod_codigo=NODO_CODIGO,
                nod_ubicacion="Borde del estanque de prueba",
                nod_activo=True,
                nod_creado_at=datetime.now(timezone.utc),
            )
            db.add(nodo)
            db.flush()
            print(f"[seed] Nodo creado: {nodo.nod_nombre} ({nodo.nod_codigo})")

        for codigo, spec in PARAMETROS.items():
            parametro = db.scalars(
                select(ParametroModel).where(func.upper(ParametroModel.par_codigo) == codigo)
            ).first()
            if parametro is None:
                continue
            cambio = False
            if parametro.par_minimo is None:
                parametro.par_minimo = spec["minimo"]
                cambio = True
            if parametro.par_maximo is None:
                parametro.par_maximo = spec["maximo"]
                cambio = True
            if cambio:
                print(f"[seed] Rango configurado para {codigo}: {parametro.par_minimo} - {parametro.par_maximo}")

        db.commit()
        return nodo.nod_codigo
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def generar_lecturas(segundos_transcurridos: float) -> dict[str, float]:
    """Genera valores con tendencia sinusoidal, ruido y picos ocasionales."""
    lecturas: dict[str, float] = {}
    for codigo, spec in PARAMETROS.items():
        fase = FASES[codigo]
        onda = spec["amplitud"] * math.sin(
            2 * math.pi * segundos_transcurridos / spec["periodo"] + fase
        )
        valor = spec["base"] + onda + random.gauss(0, spec["ruido"])

        if random.random() < 0.03:
            valor += random.choice([-1, 1]) * spec["amplitud"] * random.uniform(1.5, 2.5)

        lecturas[codigo] = round(valor, spec["digitos"])
    return lecturas


def enviar_http(api_url: str, nodo_codigo: str, lecturas: dict[str, float]) -> dict[str, Any]:
    cuerpo = json.dumps(
        {
            "nodo_codigo": nodo_codigo,
            "lecturas": lecturas,
            "fecha_hora": datetime.now(timezone.utc).isoformat(),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/lecturas/ingesta",
        data=cuerpo,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def enviar_directo(nodo_codigo: str, lecturas: dict[str, float]) -> dict[str, Any]:
    db = SessionLocal()
    try:
        return registrar_ingesta(db, nodo_codigo=nodo_codigo, lecturas=lecturas)
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulador de telemetría IoT para Humedales Web")
    parser.add_argument("--interval", type=float, default=5.0, help="Segundos entre lecturas (default: 5)")
    parser.add_argument("--api-url", default=os.getenv("INGESTA_API_URL", "http://localhost:8000/api/v1"))
    parser.add_argument("--direct", action="store_true", help="Insertar directamente en PostgreSQL")
    parser.add_argument("--once", action="store_true", help="Generar una sola lectura y salir")
    parser.add_argument("--sin-seed", action="store_true", help="No crear humedal/contenedor/nodo de prueba")
    args = parser.parse_args()

    if args.sin_seed:
        nodo_codigo = NODO_CODIGO
    else:
        nodo_codigo = asegurar_estructura()

    modo = "directo a PostgreSQL" if args.direct else f"HTTP -> {args.api_url}"
    print(f"[simulador] Nodo: {nodo_codigo} | Modo: {modo} | Intervalo: {args.interval}s")
    print("[simulador] Ctrl+C para detener.\n")

    inicio = time.monotonic()
    try:
        while True:
            lecturas = generar_lecturas(time.monotonic() - inicio)
            hora = datetime.now().strftime("%H:%M:%S")
            try:
                if args.direct:
                    resultado = enviar_directo(nodo_codigo, lecturas)
                else:
                    resultado = enviar_http(args.api_url, nodo_codigo, lecturas)
                print(
                    f"[{hora}] {lecturas} -> lectura #{resultado.get('lectura_id')} "
                    f"| detalles={resultado.get('detalles_insertados')} "
                    f"| alertas={resultado.get('alertas_generadas')}"
                )
            except urllib.error.HTTPError as exc:
                detalle = exc.read().decode("utf-8", errors="replace")
                print(f"[{hora}] Error HTTP {exc.code}: {detalle}")
            except urllib.error.URLError as exc:
                print(f"[{hora}] No se pudo conectar al backend ({exc.reason}). Usa --direct o inicia FastAPI.")
            except Exception as exc:
                print(f"[{hora}] Error al registrar lectura: {exc}")

            if args.once:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[simulador] Detenido por el usuario.")


if __name__ == "__main__":
    main()
