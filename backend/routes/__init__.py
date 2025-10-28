from .cargo_routes import cargo_bp
from .usuario_routes import usuario_bp
from .empleado_routes import empleado_bp
from .horario_routes import horario_bp
from .hoja_vida_routes import hoja_vida_bp
from .asistencia_routes import asistencia_bp
from .permiso_routes import permiso_bp
from .nomina_routes import nomina_bp
from .rubro_routes import rubro_bp
from .log_transaccional_routes import log_bp

# Lista con todos los blueprints y sus prefijos
all_blueprints = [
    (cargo_bp, '/api/cargos'),
    (usuario_bp, '/api/usuarios'),
    (empleado_bp, '/api/empleados'),
    (horario_bp, '/api/horarios'),
    (hoja_vida_bp, '/api/hojas-vida'),
    (asistencia_bp, '/api/asistencias'),
    (permiso_bp, '/api/permisos'),
    (nomina_bp, '/api/nominas'),
    (rubro_bp, '/api/rubros'),
    (log_bp, '/api/logs'),
]