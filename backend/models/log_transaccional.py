from extensions import db
from datetime import datetime

class LogTransaccional(db.Model):
    __tablename__ = 'log_transaccional'
    
    id = db.Column(db.Integer, primary_key=True)
    tabla_afectada = db.Column(db.String(100), nullable=False)
    operacion = db.Column(db.String(20), nullable=False)
    id_registro = db.Column(db.Integer, nullable=False)
    usuario = db.Column(db.String(100), nullable=False)
    fecha_hora = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    datos_anteriores = db.Column(db.Text, nullable=True)
    datos_nuevos = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tabla_afectada': self.tabla_afectada,
            'operacion': self.operacion,
            'id_registro': self.id_registro,
            'usuario': self.usuario,
            'fecha_hora': self.fecha_hora.isoformat() if self.fecha_hora else None,
            'datos_anteriores': self.datos_anteriores,
            'datos_nuevos': self.datos_nuevos
        }