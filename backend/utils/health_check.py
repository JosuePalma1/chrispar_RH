"""
Health Check automático para failover a Mirror
"""
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
import time
import logging

logger = logging.getLogger(__name__)


class DatabaseHealthCheck:
    """Monitorea la salud de la base de datos y maneja failover automático."""
    
    def __init__(self, app):
        self.app = app
        self.primary_url = app.config.get('SQLALCHEMY_DATABASE_URI')
        self.mirror_url = app.config.get('MIRROR_DATABASE_URL')
        self.current_db = 'primary'
        self.failover_enabled = app.config.get('AUTO_FAILOVER_ENABLED', False)
        self.check_interval = app.config.get('HEALTH_CHECK_INTERVAL', 30)  # segundos
        self.max_retries = app.config.get('HEALTH_CHECK_RETRIES', 3)
        
    def check_connection(self, db_url, timeout=5):
        """Verifica si una base de datos está disponible."""
        try:
            engine = create_engine(db_url, connect_args={'connect_timeout': timeout})
            with engine.connect() as conn:
                conn.execute(text('SELECT 1'))
            engine.dispose()
            return True
        except OperationalError as e:
            logger.warning(f"Database connection failed: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking database: {str(e)}")
            return False
    
    def is_primary_healthy(self):
        """Verifica si el primary está saludable."""
        if not self.primary_url:
            return False
        
        for attempt in range(self.max_retries):
            if self.check_connection(self.primary_url):
                return True
            if attempt < self.max_retries - 1:
                time.sleep(2)
        
        return False
    
    def is_mirror_healthy(self):
        """Verifica si el mirror está saludable."""
        if not self.mirror_url:
            return False
        return self.check_connection(self.mirror_url)
    
    def perform_failover(self):
        """Ejecuta el failover al mirror."""
        if not self.mirror_url:
            logger.error("FAILOVER FAILED: No mirror database configured")
            return False
        
        if not self.is_mirror_healthy():
            logger.error("FAILOVER FAILED: Mirror database is not healthy")
            return False
        
        try:
            logger.warning("🔄 PERFORMING AUTOMATIC FAILOVER TO MIRROR DATABASE")
            
            # Cambiar la configuración de SQLAlchemy
            self.app.config['SQLALCHEMY_DATABASE_URI'] = self.mirror_url
            
            # Recrear el engine
            from extensions import db
            db.engine.dispose()
            
            # Nota: En producción, aquí deberías también:
            # 1. Deshabilitar la suscripción en el mirror
            # 2. Actualizar las secuencias
            # 3. Notificar a los administradores
            
            self.current_db = 'mirror'
            logger.warning("✓ FAILOVER COMPLETED: Now using mirror database")
            return True
            
        except Exception as e:
            logger.error(f"FAILOVER FAILED: {str(e)}")
            return False
    
    def perform_failback(self):
        """Ejecuta el failback al primary."""
        if not self.primary_url:
            return False
        
        if not self.is_primary_healthy():
            logger.warning("FAILBACK SKIPPED: Primary database is not healthy yet")
            return False
        
        try:
            logger.info("🔄 PERFORMING AUTOMATIC FAILBACK TO PRIMARY DATABASE")
            
            # Cambiar la configuración de SQLAlchemy
            self.app.config['SQLALCHEMY_DATABASE_URI'] = self.primary_url
            
            # Recrear el engine
            from extensions import db
            db.engine.dispose()
            
            self.current_db = 'primary'
            logger.info("✓ FAILBACK COMPLETED: Now using primary database")
            return True
            
        except Exception as e:
            logger.error(f"FAILBACK FAILED: {str(e)}")
            return False
    
    def check_and_failover_if_needed(self):
        """Verifica la salud y ejecuta failover/failback si es necesario."""
        if not self.failover_enabled:
            return
        
        primary_healthy = self.is_primary_healthy()
        
        if self.current_db == 'primary' and not primary_healthy:
            logger.error("⚠️ PRIMARY DATABASE IS DOWN!")
            self.perform_failover()
        
        elif self.current_db == 'mirror' and primary_healthy:
            logger.info("✓ Primary database is back online, attempting failback...")
            self.perform_failback()
    
    def get_status(self):
        """Obtiene el estado actual de las bases de datos."""
        return {
            'current_db': self.current_db,
            'primary_healthy': self.is_primary_healthy() if self.primary_url else None,
            'mirror_healthy': self.is_mirror_healthy() if self.mirror_url else None,
            'failover_enabled': self.failover_enabled
        }
