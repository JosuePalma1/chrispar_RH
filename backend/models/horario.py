from extensions import db
from datetime import datetime, timezone
from sqlalchemy.types import Time, Date

class Horario(db.Model):
    __tablename__ = "horario"

    # Campos de la tabla (según ERD)
    id_horario = db.Column(db.Integer, primary_key=True)
    # La PK en Empleado es 'id_empleado'
    id_empleado = db.Column(db.Integer, db.ForeignKey("empleados.id"), nullable=False)
    
    dia_laborables = db.Column(db.String(255))
    fecha_inicio = db.Column(Date)
    hora_entrada = db.Column(Time)
    hora_salida = db.Column(Time)
    descanso_minutos = db.Column(db.Integer) # Nombre de columna saneado
    turno = db.Column(db.String(100)) # (matutino, vespertino, nocturno)
    inicio_vigencia = db.Column(Date)
    fin_vigencia = db.Column(Date, nullable=True) # (puede ser null)

    # Campos de auditoría (según ERD)
    fecha_creacion = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    fecha_actualizacion = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    creado_por = db.Column(db.Integer) # Debería ser FK a Usuario
    modificado_por = db.Column(db.Integer) # Debería ser FK a Usuario

    # Relación con Empleado (1 a N)
    # Un Empleado puede tener muchos Horarios, un Horario pertenece a un Empleado
    empleado = db.relationship("Empleado", back_populates="horarios")

    def __init__(self, id_empleado, dia_laborables=None, fecha_inicio=None, hora_entrada=None, hora_salida=None, descanso_minutos=None, turno=None, inicio_vigencia=None, fin_vigencia=None, creado_por=None):
        self.id_empleado = id_empleado
        self.dia_laborables = dia_laborables
        self.fecha_inicio = fecha_inicio
        self.hora_entrada = hora_entrada
        self.hora_salida = hora_salida
        self.descanso_minutos = descanso_minutos
        self.turno = turno
        self.inicio_vigencia = inicio_vigencia
        self.fin_vigencia = fin_vigencia
        self.creado_por = creado_por

    # Método para serializar el objeto (útil para el GET)
    def to_dict(self):
        return {
            "id_horario": self.id_horario,
            "id_empleado": self.id_empleado,
            "dia_laborables": self.dia_laborables,
            "fecha_inicio": self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            "hora_entrada": self.hora_entrada.isoformat() if self.hora_entrada else None,
            "hora_salida": self.hora_salida.isoformat() if self.hora_salida else None,
            "descanso_minutos": self.descanso_minutos,
            "turno": self.turno,
            "inicio_vigencia": self.inicio_vigencia.isoformat() if self.inicio_vigencia else None,
            "fin_vigencia": self.fin_vigencia.isoformat() if self.fin_vigencia else None,
            "fecha_creacion": self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            "fecha_actualizacion": self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None,
            "creado_por": self.creado_por,
            "modificado_por": self.modificado_por
        }