from extensions import db
from datetime import datetime, timezone

class Cargo(db.Model):
    __tablename__ = "cargos"
    id_cargo = db.Column(db.Integer, primary_key=True)
    nombre_cargo = db.Column(db.String(100), nullable=False)
    sueldo_base = db.Column(db.Float, nullable=False, default=0.0)
    permisos = db.Column(db.Text, nullable=True)  # JSON string con módulos permitidos

    fecha_creacion = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_actualizacion = db.Column(db.DateTime, onupdate=lambda: datetime.now(timezone.utc))
    creado_por = db.Column(db.Integer)
    modificado_por = db.Column(db.Integer)
    
    empleados = db.relationship("Empleado", back_populates="cargo")
