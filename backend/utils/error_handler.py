"""
Módulo para manejo profesional de errores en la API
Proporciona respuestas estandarizadas con códigos HTTP apropiados
"""

from flask import jsonify
from sqlalchemy.exc import OperationalError, IntegrityError, DataError
from psycopg2 import OperationalError as Psycopg2OperationalError
import logging

# Configurar logging
logger = logging.getLogger(__name__)


def handle_database_error(e, operation="operación de base de datos"):
    """
    Maneja errores de base de datos de manera profesional
    
    Args:
        e: Exception - El error capturado
        operation: str - Descripción de la operación que falló
        
    Returns:
        tuple: (response, status_code)
    """
    error_message = str(e)
    
    # Error de conexión a la base de datos
    if isinstance(e, (OperationalError, Psycopg2OperationalError)):
        if "server closed the connection" in error_message or "Connection refused" in error_message:
            logger.error(f"Database connection failed during {operation}: {error_message}")
            return jsonify({
                "error": "Servicio temporalmente no disponible",
                "code": "SERVICE_UNAVAILABLE",
                "status": 503
            }), 503
        
        logger.error(f"Database operational error during {operation}: {error_message}")
        return jsonify({
            "error": "Error de conexión con la base de datos",
            "code": "DATABASE_ERROR",
            "status": 500
        }), 500
    
    # Error de integridad (unique, foreign key, etc.)
    if isinstance(e, IntegrityError):
        if "unique constraint" in error_message.lower():
            logger.warning(f"Unique constraint violation during {operation}")
            return jsonify({
                "error": "El registro ya existe",
                "code": "DUPLICATE_ENTRY",
                "status": 409
            }), 409
        
        if "foreign key" in error_message.lower():
            logger.warning(f"Foreign key constraint violation during {operation}")
            return jsonify({
                "error": "Referencia inválida a datos relacionados",
                "code": "INVALID_REFERENCE",
                "status": 400
            }), 400
        
        logger.warning(f"Integrity error during {operation}: {error_message}")
        return jsonify({
            "error": "Error de integridad de datos",
            "code": "INTEGRITY_ERROR",
            "status": 400
        }), 400
    
    # Error de datos (tipo inválido, etc.)
    if isinstance(e, DataError):
        logger.warning(f"Data error during {operation}: {error_message}")
        return jsonify({
            "error": "Datos inválidos proporcionados",
            "code": "INVALID_DATA",
            "status": 400
        }), 400
    
    # Error genérico
    logger.error(f"Unexpected error during {operation}: {error_message}", exc_info=True)
    return jsonify({
        "error": "Error interno del servidor",
        "code": "INTERNAL_ERROR",
        "status": 500
    }), 500


def handle_validation_error(message, field=None):
    """
    Maneja errores de validación
    
    Args:
        message: str - Mensaje de error
        field: str - Campo que causó el error (opcional)
        
    Returns:
        tuple: (response, status_code)
    """
    response = {
        "error": message,
        "code": "VALIDATION_ERROR",
        "status": 400
    }
    
    if field:
        response["field"] = field
    
    return jsonify(response), 400


def handle_not_found(resource="Recurso"):
    """
    Maneja errores 404
    
    Args:
        resource: str - Nombre del recurso no encontrado
        
    Returns:
        tuple: (response, status_code)
    """
    return jsonify({
        "error": f"{resource} no encontrado",
        "code": "NOT_FOUND",
        "status": 404
    }), 404


def handle_unauthorized(message="Credenciales inválidas"):
    """
    Maneja errores de autenticación (401)
    
    Args:
        message: str - Mensaje de error
        
    Returns:
        tuple: (response, status_code)
    """
    return jsonify({
        "error": message,
        "code": "UNAUTHORIZED",
        "status": 401
    }), 401


def handle_forbidden(message="No tiene permisos para realizar esta acción"):
    """
    Maneja errores de autorización (403)
    
    Args:
        message: str - Mensaje de error
        
    Returns:
        tuple: (response, status_code)
    """
    return jsonify({
        "error": message,
        "code": "FORBIDDEN",
        "status": 403
    }), 403


def handle_success(data, message="Operación exitosa", status=200):
    """
    Respuesta exitosa estandarizada
    
    Args:
        data: dict - Datos a retornar
        message: str - Mensaje de éxito
        status: int - Código de estado HTTP
        
    Returns:
        tuple: (response, status_code)
    """
    response = {
        "success": True,
        "message": message,
        "data": data,
        "status": status
    }
    
    return jsonify(response), status
