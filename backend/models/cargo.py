from extensions import db
from datetime import datetime

class Cargo(db.Model):
    __tablename__ = "cargos"
    id_cargo = db.Column(db.Integer, primary_key=True)
    nombre_cargo = db.Column(db.String(100), nullable=False)
    sueldo_base = db.Column(db.Float, nullable=False, default=0.0)

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer)
    modificado_por = db.Column(db.Integer)
    
    empleados = db.relationship("Empleado", back_populates="cargo")
