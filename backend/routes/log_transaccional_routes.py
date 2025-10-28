from flask import Blueprint, request, jsonify
from extensions import db
from models.log_transaccional import LogTransaccional

log_bp = Blueprint('log_bp', __name__)

# GET - Obtener todos los logs
@log_bp.route('/', methods=['GET'])
def get_logs():
    try:
        logs = LogTransaccional.query.all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# GET - Obtener log por ID
@log_bp.route('/<int:id>', methods=['GET'])
def get_log(id):
    try:
        log = LogTransaccional.query.get(id)
        if not log:
            return jsonify({'error': 'Log no encontrado'}), 404
        return jsonify(log.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# GET - Obtener logs por tabla
@log_bp.route('/tabla/<string:tabla>', methods=['GET'])
def get_logs_by_tabla(tabla):
    try:
        logs = LogTransaccional.query.filter_by(tabla_afectada=tabla).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# POST - Crear un nuevo log
@log_bp.route('/', methods=['POST'])
def create_log():
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        if not data.get('tabla_afectada'):
            return jsonify({'error': 'tabla_afectada es requerido'}), 400
        if not data.get('operacion'):
            return jsonify({'error': 'operacion es requerido'}), 400
        if not data.get('id_registro'):
            return jsonify({'error': 'id_registro es requerido'}), 400
        if not data.get('usuario'):
            return jsonify({'error': 'usuario es requerido'}), 400
        
        # Validar que la operación sea válida
        operaciones_validas = ['INSERT', 'UPDATE', 'DELETE']
        if data['operacion'] not in operaciones_validas:
            return jsonify({'error': 'operacion debe ser INSERT, UPDATE o DELETE'}), 400
        
        nuevo_log = LogTransaccional(
            tabla_afectada=data['tabla_afectada'],
            operacion=data['operacion'],
            id_registro=data['id_registro'],
            usuario=data['usuario'],
            datos_anteriores=data.get('datos_anteriores'),
            datos_nuevos=data.get('datos_nuevos')
        )
        
        db.session.add(nuevo_log)
        db.session.commit()
        
        return jsonify(nuevo_log.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# PUT - Actualizar un log
@log_bp.route('/<int:id>', methods=['PUT'])
def update_log(id):
    try:
        log = LogTransaccional.query.get(id)
        if not log:
            return jsonify({'error': 'Log no encontrado'}), 404
        
        data = request.get_json()
        
        if 'tabla_afectada' in data:
            log.tabla_afectada = data['tabla_afectada']
        if 'operacion' in data:
            operaciones_validas = ['INSERT', 'UPDATE', 'DELETE']
            if data['operacion'] not in operaciones_validas:
                return jsonify({'error': 'operacion debe ser INSERT, UPDATE o DELETE'}), 400
            log.operacion = data['operacion']
        if 'id_registro' in data:
            log.id_registro = data['id_registro']
        if 'usuario' in data:
            log.usuario = data['usuario']
        if 'datos_anteriores' in data:
            log.datos_anteriores = data['datos_anteriores']
        if 'datos_nuevos' in data:
            log.datos_nuevos = data['datos_nuevos']
        
        db.session.commit()
        return jsonify(log.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# DELETE - Eliminar un log
@log_bp.route('/<int:id>', methods=['DELETE'])
def delete_log(id):
    try:
        log = LogTransaccional.query.get(id)
        if not log:
            return jsonify({'error': 'Log no encontrado'}), 404
        
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'Log eliminado correctamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500