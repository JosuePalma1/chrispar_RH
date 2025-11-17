from extensions import db
from datetime import datetime

class Permiso(db.Model):
    __tablename__ = "permisos"
    
    id_permiso = db.Column(db.Integer, primary_key=True)
    id_empleado = db.Column(db.Integer, db.ForeignKey("empleados.id"), nullable=False)
    
    tipo = db.Column(db.String(50), nullable=False)  # permiso, vacaciones, licencias
    descripcion = db.Column(db.String(255), nullable=True)
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    estado = db.Column(db.String(50), nullable=False)  # pendiente, aprobado, rechazado
    autorizado_por = db.Column(db.String(100), nullable=True)
    
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer, nullable=True)
    modificado_por = db.Column(db.Integer, nullable=True)
    
    # Relación con Empleado
    empleado = db.relationship("Empleado", back_populates="permisos")
    
    def __repr__(self):
        return f"<Permiso {self.id_permiso} - Empleado {self.id_empleado} - {self.tipo}>"
