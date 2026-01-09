"""
Módulo de Health Check con Auto-Failover para la base de datos
"""
from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
import os
import logging

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)


def check_database_connection(db_url, timeout=5):
    """Verifica si una base de datos está disponible."""
    from sqlalchemy import create_engine
    try:
        engine = create_engine(db_url, connect_args={'connect_timeout': timeout})
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1'))
            result.fetchone()
        engine.dispose()
        return True, "Connection successful"
    except OperationalError as e:
        return False, f"Connection failed: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"


def perform_failover_to_mirror(app, db):
    """Ejecuta el failover automático al mirror."""
    mirror_url = app.config.get('MIRROR_DATABASE_URL')
    
    if not mirror_url:
        logger.error("❌ FAILOVER FAILED: No MIRROR_DATABASE_URL configured")
        return False
    
    # Verificar que el mirror esté disponible
    mirror_ok, mirror_msg = check_database_connection(mirror_url)
    if not mirror_ok:
        logger.error(f"❌ FAILOVER FAILED: Mirror database not available - {mirror_msg}")
        return False
    
    try:
        logger.warning("🔄 PERFORMING AUTOMATIC FAILOVER TO MIRROR DATABASE")
        
        # Cambiar la URL de la base de datos
        old_url = app.config['SQLALCHEMY_DATABASE_URI']
        app.config['SQLALCHEMY_DATABASE_URI'] = mirror_url
        
        # Recrear el engine de SQLAlchemy
        db.engine.dispose()
        
        logger.warning(f"✅ FAILOVER COMPLETED")
        logger.warning(f"   FROM: {old_url}")
        logger.warning(f"   TO:   {mirror_url}")
        logger.info("⚠️  Remember to run sequence updates on mirror!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ FAILOVER FAILED: {str(e)}")
        return False


@health_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint de health check con auto-failover."""
    from extensions import db
    from flask import current_app as app
    
    primary_url = app.config.get('SQLALCHEMY_DATABASE_URI')
    mirror_url = app.config.get('MIRROR_DATABASE_URL')
    auto_failover = app.config.get('AUTO_FAILOVER_ENABLED', False)
    
    # Verificar conexión actual
    try:
        with db.engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        current_status = "healthy"
        current_db = "mirror" if mirror_url and mirror_url in primary_url else "primary"
    except OperationalError:
        current_status = "unhealthy"
        current_db = "unknown"
        
        # Auto-failover si está habilitado
        if auto_failover and mirror_url:
            logger.warning("🔴 PRIMARY DATABASE UNHEALTHY - Attempting auto-failover...")
            failover_success = perform_failover_to_mirror(app, db)
            
            if failover_success:
                current_status = "healthy (failover)"
                current_db = "mirror"
            else:
                return jsonify({
                    "status": "error",
                    "message": "Primary unhealthy and failover failed",
                    "current_db": "none",
                    "auto_failover": auto_failover
                }), 503
    
    # Verificar estado de ambas bases de datos
    primary_healthy = False
    mirror_healthy = False
    
    if mirror_url:
        # Verificar primary original
        primary_check_url = primary_url.replace('postgres_mirror', 'postgres_primary')
        primary_healthy, _ = check_database_connection(primary_check_url)
        
        # Verificar mirror
        mirror_healthy, _ = check_database_connection(mirror_url)
    else:
        primary_healthy = current_status == "healthy"
    
    return jsonify({
        "status": current_status,
        "current_db": current_db,
        "databases": {
            "primary": {
                "status": "healthy" if primary_healthy else "unhealthy",
                "url": primary_url.split('@')[1] if '@' in primary_url else "N/A"
            },
            "mirror": {
                "status": "healthy" if mirror_healthy else "unhealthy",
                "url": mirror_url.split('@')[1] if mirror_url and '@' in mirror_url else "Not configured"
            }
        },
        "auto_failover": auto_failover
    }), 200 if current_status.startswith("healthy") else 503


@health_bp.route('/health/failover', methods=['POST'])
def manual_failover():
    """Endpoint para ejecutar failover manual al mirror."""
    from extensions import db
    from flask import current_app as app
    
    mirror_url = app.config.get('MIRROR_DATABASE_URL')
    
    if not mirror_url:
        return jsonify({
            "status": "error",
            "message": "No mirror database configured"
        }), 400
    
    success = perform_failover_to_mirror(app, db)
    
    if success:
        return jsonify({
            "status": "success",
            "message": "Failover to mirror completed successfully",
            "current_db": "mirror"
        }), 200
    else:
        return jsonify({
            "status": "error",
            "message": "Failover failed"
        }), 500
