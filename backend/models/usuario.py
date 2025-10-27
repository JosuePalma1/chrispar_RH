from extensions import db
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(50), nullable=False)  # admin, supervisor, empleado

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, onupdate=datetime.utcnow)

    empleado = db.relationship("Empleado", back_populates="usuario", uselist=False)
    # Descomentar cuando se cree el modelo LogTransaccional:
    # logs = db.relationship("LogTransaccional", back_populates="usuario")
