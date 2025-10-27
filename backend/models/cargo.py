from extensions import db
from datetime import datetime

class Cargo(db.Model):
    __tablename__ = "cargos"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    sueldo_base = db.Column(db.Float, nullable=False, default=0.0)

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer)     # FK a usuario (puedes agregar FK si quieres)
    modificado_por = db.Column(db.Integer)
    
    empleados = db.relationship("Empleado", back_populates="cargo")
