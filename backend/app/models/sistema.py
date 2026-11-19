from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Numeric,
    String,
    Text,
    BigInteger,
    Integer,
    ForeignKey,
    ForeignKeyConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class RolModel(Base):
    __tablename__ = "rol"

    rol_id = Column(Integer, primary_key=True, index=True)
    rol_nombre = Column(String, nullable=False)
    rol_descripcion = Column(Text)
    rol_activo = Column(Boolean, nullable=False, default=True)

    usuarios = relationship("UsuarioModel", back_populates="rol")


class UsuarioModel(Base):
    __tablename__ = "usuario"

    usr_id = Column(BigInteger, primary_key=True, index=True)
    usr_rol_id = Column(Integer, ForeignKey("rol.rol_id"), nullable=False)
    usr_nombre = Column(String, nullable=False)
    usr_apellido = Column(String)
    usr_correo = Column(String, unique=True, nullable=False)
    usr_password_hash = Column(String, nullable=False)
    usr_activo = Column(Boolean, nullable=False, default=True)
    usr_creado_at = Column(DateTime(timezone=True), nullable=False)

    rol = relationship("RolModel", back_populates="usuarios")

    @property
    def rol_nombre(self) -> str | None:
        return self.rol.rol_nombre if self.rol else None


class ParametroModel(Base):
    __tablename__ = "parametro"

    par_id = Column(BigInteger, primary_key=True, index=True)
    par_codigo = Column(String, nullable=False)
    par_nombre = Column(String, nullable=False)
    par_descripcion = Column(Text)
    par_tipo_valor = Column(String, nullable=False, default="numerico")
    par_unidad_ref = Column(String)
    par_origen = Column(String, nullable=False, default="medido")
    par_minimo = Column(Numeric)
    par_maximo = Column(Numeric)
    par_activo = Column(Boolean, nullable=False, default=True)

    detalles = relationship("DetalleLecturaModel", back_populates="parametro")


class DetalleLecturaModel(Base):
    __tablename__ = "detalle_lectura"
    __table_args__ = (
        ForeignKeyConstraint(
            ["det_senpar_id", "det_par_id"],
            ["sensor_parametro.senpar_id", "sensor_parametro.senpar_par_id"],
            name="fk_detalle_sensor_parametro",
        ),
    )

    det_id = Column(BigInteger, primary_key=True, index=True)
    det_lec_id = Column(BigInteger, ForeignKey("lectura.lec_id"), nullable=False)
    det_par_id = Column(BigInteger, ForeignKey("parametro.par_id"), nullable=False)
    det_senpar_id = Column(BigInteger)
    det_valor_num = Column(Numeric)
    det_valor_texto = Column(Text)
    det_valor_booleano = Column(Boolean)
    det_unidad = Column(String)
    det_valor_original = Column(Text)
    det_estado = Column(String, nullable=False, default="valido")
    det_num_muestras = Column(Integer)
    det_creado_at = Column(DateTime(timezone=True), nullable=False)

    parametro = relationship("ParametroModel", back_populates="detalles")


class AlertaModel(Base):
    __tablename__ = "alerta"

    ale_id = Column(BigInteger, primary_key=True, index=True)
    ale_nod_id = Column(BigInteger, ForeignKey("nodo.nod_id"), nullable=False)
    ale_lectura_id = Column(BigInteger, ForeignKey("lectura.lec_id"))
    ale_tipo = Column(String, nullable=False)
    ale_severidad = Column(String, nullable=False, default="media")
    ale_titulo = Column(String, nullable=False)
    ale_descripcion = Column(Text)
    ale_generada_at = Column(DateTime(timezone=True), nullable=False)
    ale_atendida_at = Column(DateTime(timezone=True))
    ale_estado = Column(String, nullable=False, default="pendiente")
