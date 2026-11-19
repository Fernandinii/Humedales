from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)

from app.core.database import Base


class ConexionContenedorModel(Base):
    __tablename__ = "conexion_contenedor"
    __table_args__ = (
        UniqueConstraint("cco_origen_id", "cco_destino_id", name="uq_conexion_contenedor"),
    )

    cco_id = Column(BigInteger, primary_key=True, index=True)
    cco_origen_id = Column(BigInteger, ForeignKey("contenedor.con_id"), nullable=False)
    cco_destino_id = Column(BigInteger, ForeignKey("contenedor.con_id"), nullable=False)
    cco_descripcion = Column(Text)
    cco_activa = Column(Boolean, nullable=False, default=True)
    cco_creada_at = Column(DateTime(timezone=True), nullable=False)


class DispositivoUsuarioModel(Base):
    __tablename__ = "dispositivo_usuario"

    dis_id = Column(BigInteger, primary_key=True, index=True)
    dis_usr_id = Column(BigInteger, ForeignKey("usuario.usr_id"), nullable=False)
    dis_token_hash = Column(String(255), nullable=False, unique=True)
    dis_plataforma = Column(String(30), nullable=False)
    dis_activo = Column(Boolean, nullable=False, default=True)
    dis_creado_at = Column(DateTime(timezone=True), nullable=False)
    dis_actualizado_at = Column(DateTime(timezone=True), nullable=False)
