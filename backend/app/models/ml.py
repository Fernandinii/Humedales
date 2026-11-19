from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)

from app.core.database import Base


class ModeloMLModel(Base):
    __tablename__ = "modelo_ml"
    __table_args__ = (
        UniqueConstraint("mod_nombre", "mod_version", name="uq_modelo_version"),
    )

    mod_id = Column(BigInteger, primary_key=True, index=True)
    mod_nombre = Column(String(150), nullable=False)
    mod_version = Column(String(50), nullable=False)
    mod_descripcion = Column(Text)
    mod_algoritmo = Column(String(100))
    mod_ruta_archivo = Column(Text)
    mod_entrenado_at = Column(DateTime(timezone=True))
    mod_activo = Column(Boolean, nullable=False, default=True)
    mod_creado_at = Column(DateTime(timezone=True), nullable=False)


class PrediccionLecturaModel(Base):
    __tablename__ = "prediccion_lectura"

    pre_id = Column(BigInteger, primary_key=True, index=True)
    pre_nod_id = Column(BigInteger, ForeignKey("nodo.nod_id"), nullable=False)
    pre_mod_id = Column(BigInteger, ForeignKey("modelo_ml.mod_id"), nullable=False)
    pre_lectura_ref_id = Column(BigInteger, ForeignKey("lectura.lec_id"))
    pre_parametro = Column(String(50), nullable=False)
    pre_valor_predicho = Column(Numeric(14, 5), nullable=False)
    pre_unidad = Column(String(30))
    pre_fecha_objetivo = Column(DateTime(timezone=True))
    pre_generado_at = Column(DateTime(timezone=True), nullable=False)
    pre_confianza = Column(Numeric(5, 4))
