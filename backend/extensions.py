from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy.exc import OperationalError
import logging
import os

db = SQLAlchemy()
migrate = Migrate()

logger = logging.getLogger(__name__)

class DatabaseFailover:
    """Maneja failover automático al mirror cuando el primary falla."""
    
    def __init__(self):
        self.using_mirror = False
        self.primary_url = None
        self.mirror_url = None
        self.app = None
    
    def init_app(self, app):
        """Inicializa el sistema de failover con la aplicación Flask."""
        self.app = app
        self.primary_url = app.config['SQLALCHEMY_DATABASE_URI']
        self.mirror_url = app.config.get('MIRROR_DATABASE_URL')
        
        if not self.mirror_url:
            logger.warning("MIRROR_DATABASE_URL no configurado - failover automático deshabilitado")
            return
        
        logger.info("Sistema de failover inicializado")
        logger.info(f"Primary: {self.primary_url[:50]}...")
        logger.info(f"Mirror: {self.mirror_url[:50]}...")
    
    def _switch_to_mirror(self):
        """Cambia la conexión al mirror."""
        if self.using_mirror or not self.mirror_url:
            return
        
        try:
            logger.warning("=" * 70)
            logger.warning("EJECUTANDO FAILOVER AUTOMÁTICO AL MIRROR")
            logger.warning("=" * 70)
            
            # Cambiar la URL de conexión
            self.app.config['SQLALCHEMY_DATABASE_URI'] = self.mirror_url
            self.using_mirror = True
            
            # Recrear el engine
            db.engine.dispose()
            
            logger.info(f"✓ Failover completado - Usando mirror: {self.mirror_url}")
            
            # Ejecutar comandos de preparación del mirror
            self._prepare_mirror()
            
        except Exception as e:
            logger.error(f"Error durante failover: {e}")
            # Intentar volver al primary
            self.app.config['SQLALCHEMY_DATABASE_URI'] = self.primary_url
            self.using_mirror = False
    
    def _prepare_mirror(self):
        """Prepara el mirror para aceptar escrituras."""
        try:
            with db.engine.connect() as conn:
                # Deshabilitar la suscripción
                logger.info("Deshabilitando suscripción en mirror...")
                conn.execute(db.text("DROP SUBSCRIPTION IF EXISTS chrispar_sub;"))
                conn.commit()
                
                # Resetear secuencias
                logger.info("Reseteando secuencias...")
                sequences = [
                    ("usuarios", "id"),
                    ("empleados", "id"),
                    ("cargos", "id_cargo"),
                    ("horario", "id_horario"),
                    ("asistencias", "id_asistencia"),
                    ("permisos", "id_permiso"),
                    ("nominas", "id_nomina"),
                    ("rubros", "id_rubro"),
                    ("hoja_vida", "id_hoja_vida"),
                    ("log_transaccional", "id"),
                ]
                
                for table, column in sequences:
                    query = db.text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{table}', '{column}'), 
                            COALESCE(MAX({column}), 1)
                        ) FROM {table};
                    """)
                    conn.execute(query)
                
                conn.commit()
                logger.info("✓ Mirror preparado para operación")
                
        except Exception as e:
            logger.error(f"Error preparando mirror: {e}")
    
    def try_reconnect_primary(self):
        """Intenta reconectar al primary (para failback)."""
        if not self.using_mirror:
            return True
        
        try:
            # Intentar conectar al primary
            from sqlalchemy import create_engine
            test_engine = create_engine(self.primary_url)
            with test_engine.connect() as conn:
                conn.execute(db.text("SELECT 1"))
            test_engine.dispose()
            
            # Si llegamos aquí, el primary está disponible
            logger.info("Primary disponible - ejecutando failback...")
            self._switch_to_primary()
            return True
            
        except Exception:
            return False
    
    def _switch_to_primary(self):
        """Cambia de vuelta al primary."""
        try:
            logger.warning("=" * 70)
            logger.warning("EJECUTANDO FAILBACK AL PRIMARY")
            logger.warning("=" * 70)
            
            self.app.config['SQLALCHEMY_DATABASE_URI'] = self.primary_url
            self.using_mirror = False
            
            db.engine.dispose()
            
            logger.info(f"✓ Failback completado - Usando primary: {self.primary_url}")
            
        except Exception as e:
            logger.error(f"Error durante failback: {e}")
    
    def get_current_database(self):
        """Retorna 'primary' o 'mirror' según la BD activa."""
        return "mirror" if self.using_mirror else "primary"

# Instancia global de failover
db_failover = DatabaseFailover()
