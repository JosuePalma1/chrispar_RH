from app import db
from datetime import datetime
from sqlalchemy.types import Date

class Hoja_Vida(db.Model):
    __tablename__ = "hoja_vida"

    # Campos de la tabla (según ERD)
    id_hoja_vida = db.Column(db.Integer, primary_key=True)
    id_empleado = db.Column(db.Integer, db.ForeignKey("empleados.id"), nullable=False)
    
    tipo = db.Column(db.String(255)) # (Certificado, Curso, Maestría, etc.)
    nombre_documento = db.Column(db.String(255))
    institucion = db.Column(db.String(255))
    fecha_inicio = db.Column(Date)
    fecha_finalizacion = db.Column(Date)
    ruta_archivo_url = db.Column(db.String(500)) # Saneado de "ruta_archivo(urlpath)"

    # Campos de auditoría (según ERD)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer)
    modificado_por = db.Column(db.Integer)
    
    # Número_horas no estaba en el ERD para esta tabla, pero sí en Empleado.
    # Si 'Numero_horas' pertenece aquí, deberías agregarlo:
    # numero_horas = db.Column(db.Integer)

    # Relación con Empleado (1 a N)
    empleado = db.relationship("Empleado", back_populates="hojas_vida")

    def __init__(self, id_empleado, tipo=None, nombre_documento=None, institucion=None, fecha_inicio=None, fecha_finalizacion=None, ruta_archivo_url=None, creado_por=None):
        self.id_empleado = id_empleado
        self.tipo = tipo
        self.nombre_documento = nombre_documento
        self.institucion = institucion
        self.fecha_inicio = fecha_inicio
        self.fecha_finalizacion = fecha_finalizacion
        self.ruta_archivo_url = ruta_archivo_url
        self.creado_por = creado_por

    # Método para serializar
    def to_dict(self):
        return {
            "id_hoja_vida": self.id_hoja_vida,
            "id_empleado": self.id_empleado,
            "tipo": self.tipo,
            "nombre_documento": self.nombre_documento,
            "institucion": self.institucion,
            "fecha_inicio": self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            "fecha_finalizacion": self.fecha_finalizacion.isoformat() if self.fecha_finalizacion else None,
            "ruta_archivo_url": self.ruta_archivo_url,
            "fecha_creacion": self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            "fecha_actualizacion": self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            "creado_por": self.creado_por,
            "modificado_por": self.modificado_por
        }