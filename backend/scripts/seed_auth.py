#!/usr/bin/env python3
"""Seed idempotente de roles y usuario administrador para Humedales Web."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

try:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.sistema import RolModel, UsuarioModel

ROLES = [
    ("Administrador", "Acceso total al sistema y administración de usuarios"),
    ("Investigador", "Gestión de infraestructura, sensores y parámetros"),
    ("Técnico", "Consulta de información y seguimiento de alertas"),
]

ADMIN_NOMBRE = "Administrador"
ADMIN_APELLIDO = "ITVH"
ADMIN_CORREO = "admin@itvh.edu.mx"
ADMIN_PASSWORD = "Admin1234!"


def main() -> None:
    db = SessionLocal()
    try:
        roles: dict[str, RolModel] = {}
        for nombre, descripcion in ROLES:
            rol = db.scalars(
                select(RolModel).where(RolModel.rol_nombre == nombre)
            ).first()
            if rol is None:
                rol = RolModel(
                    rol_nombre=nombre,
                    rol_descripcion=descripcion,
                    rol_activo=True,
                )
                db.add(rol)
                db.flush()
                print(f"[seed] Rol creado: {nombre} (id={rol.rol_id})")
            else:
                if not rol.rol_activo:
                    rol.rol_activo = True
                print(f"[seed] Rol existente: {nombre} (id={rol.rol_id})")
            roles[nombre] = rol

        admin_rol = roles["Administrador"]
        admin = db.scalars(
            select(UsuarioModel).where(
                func.lower(UsuarioModel.usr_correo) == ADMIN_CORREO
            )
        ).first()

        if admin is None:
            admin = UsuarioModel(
                usr_rol_id=admin_rol.rol_id,
                usr_nombre=ADMIN_NOMBRE,
                usr_apellido=ADMIN_APELLIDO,
                usr_correo=ADMIN_CORREO,
                usr_password_hash=hash_password(ADMIN_PASSWORD),
                usr_activo=True,
                usr_creado_at=datetime.now(timezone.utc),
            )
            db.add(admin)
            db.flush()
            print(f"[seed] Usuario administrador creado: {ADMIN_CORREO}")
        else:
            admin.usr_rol_id = admin_rol.rol_id
            admin.usr_activo = True
            print(f"[seed] Usuario administrador existente: {ADMIN_CORREO}")

        db.commit()
        print("[seed] Completado correctamente.")
        print(f"[seed] Credenciales: {ADMIN_CORREO} / {ADMIN_PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
