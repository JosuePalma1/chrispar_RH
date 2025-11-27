from flask import Blueprint, request, jsonify
from models.log_transaccional import LogTransaccional
from utils.auth import token_required
from datetime import datetime
from sqlalchemy import and_

log_bp = Blueprint('log', __name__, url_prefix='/api/logs')

# GET - Obtener todos los logs con filtros y paginación
@log_bp.route('/', methods=['GET'])
@token_required
def get_logs(current_user):
    try:
        # Obtener parámetros de paginación
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Obtener parámetros de filtro
        tabla = request.args.get('tabla', '')
        operacion = request.args.get('operacion', '')
        fecha_desde = request.args.get('fecha_desde', '')
        fecha_hasta = request.args.get('fecha_hasta', '')
        
        # Construir query base
        query = LogTransaccional.query
        
        # Aplicar filtros
        filtros = []
        
        if tabla:
            filtros.append(LogTransaccional.tabla_afectada == tabla)
        
        if operacion:
            filtros.append(LogTransaccional.operacion == operacion)
        
        if fecha_desde:
            try:
                fecha_desde_obj = datetime.strptime(fecha_desde, '%Y-%m-%d')
                filtros.append(LogTransaccional.fecha_hora >= fecha_desde_obj)
            except ValueError:
                return jsonify({'error': 'Formato de fecha_desde inválido. Use YYYY-MM-DD'}), 400
        
        if fecha_hasta:
            try:
                # Agregar un día para incluir todo el día de fecha_hasta
                fecha_hasta_obj = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                from datetime import timedelta
                fecha_hasta_obj = fecha_hasta_obj + timedelta(days=1)
                filtros.append(LogTransaccional.fecha_hora < fecha_hasta_obj)
            except ValueError:
                return jsonify({'error': 'Formato de fecha_hasta inválido. Use YYYY-MM-DD'}), 400
        
        # Aplicar todos los filtros
        if filtros:
            query = query.filter(and_(*filtros))
        
        # Ordenar por fecha descendente (más reciente primero)
        query = query.order_by(LogTransaccional.fecha_hora.desc())
        
        # Paginar resultados
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Formatear respuesta
        logs = [log.to_dict() for log in pagination.items]
        
        return jsonify({
            'logs': logs,
            'total': pagination.total,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total_pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET - Obtener log por ID
@log_bp.route('/<int:id>', methods=['GET'])
@token_required
def get_log(current_user, id):
    try:
        log = LogTransaccional.query.get(id)
        if not log:
            return jsonify({'error': 'Log no encontrado'}), 404
        return jsonify(log.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET - Obtener logs por tabla (mantener para compatibilidad)
@log_bp.route('/tabla/<string:tabla>', methods=['GET'])
@token_required
def get_logs_by_tabla(current_user, tabla):
    try:
        logs = LogTransaccional.query.filter_by(tabla_afectada=tabla).order_by(LogTransaccional.fecha_hora.desc()).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500