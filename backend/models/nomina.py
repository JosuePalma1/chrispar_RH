from extensions import db
from datetime import datetime


class Nomina(db.Model):
    __tablename__ = "nominas"

    id_nomina = db.Column(db.Integer, primary_key=True)
    id_empleado = db.Column(db.Integer, db.ForeignKey("empleados.id"), nullable=False)

    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    total = db.Column(db.Float, nullable=False, default=0.0)
    estado = db.Column(db.String(50), nullable=False, default='pendiente')

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer, nullable=True)
    modificado_por = db.Column(db.Integer, nullable=True)

    # Relaciones
    empleado = db.relationship("Empleado", back_populates="nominas")
    rubros = db.relationship("Rubro", back_populates="nomina", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Nomina {self.id_nomina} - Empleado {self.id_empleado} - {self.fecha_inicio} to {self.fecha_fin}>"
