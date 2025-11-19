from extensions import db
from datetime import datetime

class Empleado(db.Model):
    __tablename__ = "empleados"
    id = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    id_cargo = db.Column(db.Integer, db.ForeignKey("cargos.id_cargo"), nullable=False)

    nombres = db.Column(db.String(100))
    apellidos = db.Column(db.String(100))
    fecha_nacimiento = db.Column(db.Date)
    cedula = db.Column(db.String(30), unique=True)
    estado = db.Column(db.String(30))  # activo, inactivo, suspendido
    fecha_ingreso = db.Column(db.Date)
    fecha_egreso = db.Column(db.Date, nullable=True)
    tipo_cuenta_bancaria = db.Column(db.String(50))
    numero_cuenta_bancaria = db.Column(db.String(50))
    modalidad_fondo_reserva = db.Column(db.String(20))  # Mensual / Acumulado
    modalidad_decimos = db.Column(db.String(20))  # Mensual / Acumulado

    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, onupdate=datetime.utcnow)
    creado_por = db.Column(db.Integer)
    modificado_por = db.Column(db.Integer)

    # relaciones
    usuario = db.relationship("Usuario", back_populates="empleado", uselist=False)
    cargo = db.relationship("Cargo", back_populates="empleados")
    asistencias = db.relationship("Asistencia", back_populates="empleado", cascade="all, delete-orphan")
    permisos = db.relationship("Permiso", back_populates="empleado", cascade="all, delete-orphan")
    horarios = db.relationship("Horario", back_populates="empleado", cascade="all, delete-orphan")
    hojas_vida = db.relationship("Hoja_Vida", back_populates="empleado", cascade="all, delete-orphan")
    nominas = db.relationship("Nomina", back_populates="empleado", cascade="all, delete-orphan")
