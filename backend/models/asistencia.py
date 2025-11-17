from extensions import db
from datetime import datetime

class Asistencia(db.Model):
    __tablename__ = "asistencias"
    
    id_asistencia = db.Column(db.Integer, primary_key=True)
    id_empleado = db.Column(db.Integer, db.ForeignKey("empleados.id"), nullable=False)
    
    fecha = db.Column(db.Date, nullable=False)
    hora_entrada = db.Column(db.Time, nullable=False)
    hora_salida = db.Column(db.Time, nullable=True)
    horas_extra = db.Column(db.Float, nullable=True, default=0.0)
    
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer, nullable=True)
    modificado_por = db.Column(db.Integer, nullable=True)
    
    # Relación con Empleado
    empleado = db.relationship("Empleado", back_populates="asistencias")
    
    def __repr__(self):
        return f"<Asistencia {self.id_asistencia} - Empleado {self.id_empleado} - {self.fecha}>"
