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
from .mirror_routes import mirror_bp
from .health_routes import health_bp

# Lista con todos los blueprints ya configurados con su propio url_prefix
all_blueprints = [
    cargo_bp,
    usuario_bp,
    empleado_bp,
    horario_bp,
    hoja_vida_bp,
    asistencia_bp,
    permiso_bp,
    nomina_bp,
    rubro_bp,
    log_bp,
    mirror_bp,
    health_bp,
]