from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class SensorModel(Base):
    __tablename__ = "sensor"

    sen_id = Column(BigInteger, primary_key=True, index=True)
    sen_nod_id = Column(BigInteger, ForeignKey("nodo.nod_id"), nullable=False)
    sen_tipo = Column(String(40), nullable=False)
    sen_modelo = Column(String(100))
    sen_unidad = Column(String(30))
    sen_fecha_instalacion = Column(Date)
    sen_activo = Column(Boolean, nullable=False, default=True)
    sen_fabricante = Column(String(100))
    sen_numero_serie = Column(String(120))
    sen_configuracion = Column(JSONB, nullable=False, default=dict)


class SensorParametroModel(Base):
    __tablename__ = "sensor_parametro"
    __table_args__ = (
        UniqueConstraint("senpar_sen_id", "senpar_par_id", name="uq_sensor_parametro"),
        UniqueConstraint("senpar_id", "senpar_par_id", name="uq_sensor_parametro_par"),
    )

    senpar_id = Column(BigInteger, primary_key=True, index=True)
    senpar_sen_id = Column(BigInteger, ForeignKey("sensor.sen_id"), nullable=False)
    senpar_par_id = Column(BigInteger, ForeignKey("parametro.par_id"), nullable=False)
    senpar_unidad = Column(String(30), nullable=False)
    senpar_resolucion = Column(Numeric)
    senpar_minimo = Column(Numeric)
    senpar_maximo = Column(Numeric)
    senpar_config = Column(JSONB, nullable=False, default=dict)
    senpar_activo = Column(Boolean, nullable=False, default=True)
