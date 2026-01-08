from extensions import db
from datetime import datetime


class Nomina(db.Model):
    __tablename__ = "nominas"
    id_nomina = db.Column(db.Integer, primary_key=True)
    id_empleado = db.Column(db.Integer, db.ForeignKey("empleados.id"), nullable=False)

    # Campos requeridos por especificación
    mes = db.Column(db.String(20), nullable=True)  # formato libre (e.g., '2025-12' o 'Diciembre 2025')
    sueldo_base = db.Column(db.Float, nullable=False, default=0.0)
    horas_extra = db.Column(db.Float, nullable=False, default=0.0)
    total_desembolsar = db.Column(db.Float, nullable=False, default=0.0)
    fecha_generacion = db.Column(db.Date, nullable=True)

    # Auditoría mínima (creado_por / modificado_por están en la migración)
    creado_por = db.Column(db.Integer, nullable=True)
    modificado_por = db.Column(db.Integer, nullable=True)

    # Relaciones
    empleado = db.relationship("Empleado", back_populates="nominas")
    rubros = db.relationship("Rubro", back_populates="nomina", cascade="all, delete-orphan")

    def __repr__(self):
        fecha = self.mes if self.mes else (self.fecha_generacion.isoformat() if self.fecha_generacion else None)
        return f"<Nomina {self.id_nomina} - Empleado {self.id_empleado} - {fecha}>"
