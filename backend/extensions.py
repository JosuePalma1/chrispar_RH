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
        # NO persistir estado - siempre iniciar con Primary
    
    def init_app(self, app):
        """Inicializa el sistema de failover con la aplicación Flask."""
        self.app = app
        
        # Guardar URLs originales
        self.primary_url = app.config['SQLALCHEMY_DATABASE_URI']
        self.mirror_url = app.config.get('MIRROR_DATABASE_URL')
        
        logger.info("Sistema de failover inicializado")
        logger.info(f"Primary: {self.primary_url[:60]}...")
        if self.mirror_url:
            logger.info(f"Mirror: {self.mirror_url[:60]}...")
        else:
            logger.warning("MIRROR_DATABASE_URL no configurado - failover deshabilitado")
    
    def _switch_to_mirror(self):
        """Cambia la conexión al mirror EN MEMORIA (no persiste)."""
        if self.using_mirror or not self.mirror_url:
            return
        
        try:
            logger.warning("=" * 70)
            logger.warning("EJECUTANDO FAILOVER AUTOMÁTICO AL MIRROR")
            logger.warning("=" * 70)
            
            # Cambiar la configuración de SQLAlchemy al mirror
            self.app.config['SQLALCHEMY_DATABASE_URI'] = self.mirror_url
            
            # CRÍTICO: Recrear el engine para que use la nueva URL
            with self.app.app_context():
                # Cerrar todas las conexiones existentes
                db.session.remove()
                db.engine.dispose()
                
                # Forzar recreación del engine con la nueva URL
                db.get_engine()
            
            # Marcar que usamos mirror
            self.using_mirror = True
            
            logger.warning("=" * 70)
            logger.warning("✅ FAILOVER COMPLETADO - AHORA USANDO MIRROR")
            logger.warning("=" * 70)
            logger.info(f"Nueva conexión: {self.mirror_url[:60]}...")
            logger.info("NOTA: Al reiniciar el backend, volverá al Primary automáticamente")
            
        except Exception as e:
            logger.error(f"❌ Error en failover: {e}", exc_info=True)
            raise
    
    def _prepare_mirror(self):
        """Prepara el mirror para aceptar escrituras."""
        try:
            # Usar una conexión temporal directa al mirror con autocommit
            from sqlalchemy import create_engine
            temp_engine = create_engine(self.mirror_url, isolation_level="AUTOCOMMIT")
            
            # Deshabilitar la suscripción
            logger.info("Deshabilitando suscripción en mirror...")
            try:
                with temp_engine.connect() as conn:
                    conn.execute(db.text("ALTER SUBSCRIPTION chrispar_sub DISABLE;"))
                logger.info("✓ Suscripción deshabilitada")
            except Exception as sub_error:
                logger.warning(f"Deshabilitar - ya deshabilitada o no existe")
            
            try:
                with temp_engine.connect() as conn:
                    conn.execute(db.text("ALTER SUBSCRIPTION chrispar_sub SET (slot_name = NONE);"))
                logger.info("✓ Slot desasociado")
            except Exception as slot_error:
                logger.warning(f"Slot - ya desasociado")
            
            try:
                with temp_engine.connect() as conn:
                    conn.execute(db.text("DROP SUBSCRIPTION IF EXISTS chrispar_sub;"))
                logger.info("✓ Suscripción eliminada")
            except Exception as drop_error:
                logger.warning(f"Drop - suscripción ya no existe")
            
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
                try:
                    with temp_engine.connect() as conn:
                        query = db.text(f"""
                            SELECT setval(
                                pg_get_serial_sequence('{table}', '{column}'), 
                                COALESCE(MAX({column}), 1)
                            ) FROM {table};
                        """)
                        result = conn.execute(query)
                        new_val = result.scalar()
                        logger.info(f"  ✓ {table}.{column} → {new_val}")
                except Exception as seq_error:
                    logger.warning(f"  ✗ {table}.{column}: {str(seq_error)[:50]}")
            
            logger.info("✅ Mirror preparado para operación")
            
            # Cerrar engine temporal
            temp_engine.dispose()
                
        except Exception as e:
            logger.error(f"Error preparando mirror: {e}")
            logger.error("Traceback:", exc_info=True)
    
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
            
            # Recrear el engine para usar Primary
            with self.app.app_context():
                db.session.remove()
                db.engine.dispose()
                db.get_engine()
            
            self.using_mirror = False
            
            logger.info(f"✓ Failback completado - Usando primary: {self.primary_url}")
            
        except Exception as e:
            logger.error(f"Error durante failback: {e}")
    
    def get_current_database(self):
        """Retorna 'primary' o 'mirror' según la BD activa."""
        return "mirror" if self.using_mirror else "primary"

# Instancia global de failover
db_failover = DatabaseFailover()
