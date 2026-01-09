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
        self.failover_state_file = '/tmp/failover_state.txt'
        
        # Verificar si hay un estado de failover activo
        import os
        if os.path.exists(self.failover_state_file):
            try:
                with open(self.failover_state_file, 'r') as f:
                    state = f.read().strip()
                    if state == 'mirror':
                        self.using_mirror = True
                        logger.info("🔄 Estado de failover detectado - usando mirror")
            except Exception:
                pass
    
    def init_app(self, app):
        """Inicializa el sistema de failover con la aplicación Flask."""
        self.app = app
        
        # Guardar URLs originales ANTES de cualquier cambio
        original_db_url = app.config['SQLALCHEMY_DATABASE_URI']
        self.mirror_url = app.config.get('MIRROR_DATABASE_URL')
        
        # Si hay estado de failover activo, usar mirror
        if self.using_mirror and self.mirror_url:
            # En modo failover, primary_url debe ser la configurada en .env (que es postgres_primary)
            # y mirror_url es la que vamos a usar
            self.primary_url = original_db_url  # postgres_primary
            app.config['SQLALCHEMY_DATABASE_URI'] = self.mirror_url  # Cambiar a mirror
            logger.warning("⚠️  Aplicación iniciada en modo FAILOVER (usando mirror)")
            logger.info(f"Primary (CAÍDO): {self.primary_url[:50]}...")
            logger.info(f"Mirror (ACTIVO): {self.mirror_url[:50]}...")
        else:
            # Modo normal: usar primary
            self.primary_url = original_db_url
            logger.info("Sistema de failover inicializado")
            if self.mirror_url:
                logger.info(f"Primary: {self.primary_url[:50]}...")
                logger.info(f"Mirror: {self.mirror_url[:50]}...")
            else:
                logger.warning("MIRROR_DATABASE_URL no configurado - failover automático deshabilitado")
    
    def _switch_to_mirror(self):
        """Cambia la conexión al mirror."""
        if self.using_mirror or not self.mirror_url:
            return
        
        try:
            logger.warning("=" * 70)
            logger.warning("EJECUTANDO FAILOVER AUTOMÁTICO AL MIRROR")
            logger.warning("=" * 70)
            
            # Ejecutar comandos de preparación del mirror
            try:
                self._prepare_mirror()
            except Exception as prep_error:
                logger.error(f"Error en _prepare_mirror: {prep_error}", exc_info=True)
            
            # Guardar estado de failover
            import os
            try:
                with open(self.failover_state_file, 'w') as f:
                    f.write('mirror')
                logger.info(f"✓ Estado de failover guardado en {self.failover_state_file}")
            except Exception as e:
                logger.error(f"Error guardando estado: {e}")
            
            # Marcar que usamos mirror
            self.using_mirror = True
            
            logger.warning("=" * 70)
            logger.warning("✅ FAILOVER COMPLETADO - REINICIANDO PROCESO AUTOMÁTICAMENTE")
            logger.warning("=" * 70)
            
            # Reiniciar el proceso Python automáticamente
            # El nuevo proceso leerá el estado y usará el mirror desde el inicio
            import sys
            import os as os_module
            
            logger.info("🔄 Reiniciando proceso Python para aplicar failover...")
            os_module.execv(sys.executable, ['python'] + sys.argv)
            
        except Exception as e:
            logger.error(f"Error durante failover: {e}", exc_info=True)
            self.using_mirror = False
            self.using_mirror = False
    
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
