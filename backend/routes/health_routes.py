"""
Blueprint para endpoints de monitoreo y health check
"""
from flask import Blueprint, jsonify
from flask_cors import cross_origin
from extensions import db, db_failover
from datetime import datetime, timezone
import logging

health_bp = Blueprint('health', __name__)
logger = logging.getLogger(__name__)

@health_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """
    Endpoint para verificar el estado de la aplicación y la base de datos.
    Retorna información sobre qué base de datos está activa.
    """
    try:
        # Intentar hacer una consulta simple
        db.session.execute(db.text("SELECT 1"))
        
        status = {
            "status": "healthy",
            "database": db_failover.get_current_database(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "connection": "active",
            "failover_enabled": db_failover.mirror_url is not None
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        status = {
            "status": "unhealthy",
            "database": db_failover.get_current_database(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }
        return jsonify(status), 503


@health_bp.route('/health/database', methods=['GET'])
@cross_origin()
def database_status():
    """
    Endpoint detallado sobre el estado de las bases de datos.
    """
    try:
        current_db = db_failover.get_current_database()
        
        status = {
            "current_database": current_db,
            "primary_url": db_failover.primary_url,
            "mirror_url": db_failover.mirror_url,
            "using_mirror": db_failover.using_mirror,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return jsonify({"error": str(e)}), 500
