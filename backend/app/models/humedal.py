from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class HumedalModel(Base):
    __tablename__ = "humedal"

    hum_id = Column(BigInteger, primary_key=True, index=True)
    hum_nombre = Column(String, nullable=False)
    hum_descripcion = Column(Text)
    hum_ubicacion = Column(String)
    hum_latitud = Column(Numeric)
    hum_longitud = Column(Numeric)
    hum_activo = Column(Boolean, nullable=False, default=True)
    hum_creado_at = Column(DateTime(timezone=True), nullable=False)

    contenedores = relationship("ContenedorModel", back_populates="humedal")
    nodos = relationship("NodoModel", back_populates="humedal")


class ContenedorModel(Base):
    __tablename__ = "contenedor"

    con_id = Column(BigInteger, primary_key=True, index=True)
    con_hum_id = Column(BigInteger, ForeignKey("humedal.hum_id"), nullable=False)
    con_codigo = Column(String, nullable=False)
    con_nombre = Column(String, nullable=False)
    con_descripcion = Column(Text)
    con_orden = Column(Integer)
    con_activo = Column(Boolean, nullable=False, default=True)
    con_creado_at = Column(DateTime(timezone=True), nullable=False)

    humedal = relationship("HumedalModel", back_populates="contenedores")
    nodos = relationship("NodoModel", back_populates="contenedor")


class NodoModel(Base):
    __tablename__ = "nodo"

    nod_id = Column(BigInteger, primary_key=True, index=True)
    nod_hum_id = Column(BigInteger, ForeignKey("humedal.hum_id"), nullable=False)
    nod_nombre = Column(String, nullable=False)
    nod_codigo = Column(String, nullable=False)
    nod_ubicacion = Column(String)
    nod_activo = Column(Boolean, nullable=False, default=True)
    nod_creado_at = Column(DateTime(timezone=True), nullable=False)
    nod_con_id = Column(BigInteger, ForeignKey("contenedor.con_id"))

    humedal = relationship("HumedalModel", back_populates="nodos")
    contenedor = relationship("ContenedorModel", back_populates="nodos")
    lecturas = relationship("LecturaModel", back_populates="nodo")


class LecturaModel(Base):
    __tablename__ = "lectura"

    lec_id = Column(BigInteger, primary_key=True, index=True)
    lec_nod_id = Column(BigInteger, ForeignKey("nodo.nod_id"), nullable=False)
    lec_ph = Column(Numeric)
    lec_temperatura = Column(Numeric)
    lec_turbidez = Column(Numeric)
    lec_tds_ppm = Column(Numeric)
    lec_conductividad_us_cm = Column(Numeric)
    lec_fecha_hora = Column(DateTime(timezone=True))
    lec_recibido_at = Column(DateTime(timezone=True), nullable=False)
    lec_id_paquete = Column(String)
    lec_payload_original = Column(JSONB)
    lec_rssi = Column(Integer)
    lec_secuencia = Column(BigInteger)

    nodo = relationship("NodoModel", back_populates="lecturas")
