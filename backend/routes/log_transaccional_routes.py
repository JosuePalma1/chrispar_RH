from flask import Blueprint, jsonify
from models.log_transaccional import LogTransaccional
from utils.auth import token_required

log_bp = Blueprint('log', __name__, url_prefix='/api/logs')

# GET - Obtener todos los logs
@log_bp.route('/', methods=['GET'])
@token_required
def get_logs(current_user):
    try:
        logs = LogTransaccional.query.all()
        return jsonify([log.to_dict() for log in logs]), 200
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

# GET - Obtener logs por tabla
@log_bp.route('/tabla/<string:tabla>', methods=['GET'])
@token_required
def get_logs_by_tabla(current_user, tabla):
    try:
        logs = LogTransaccional.query.filter_by(tabla_afectada=tabla).all()
        return jsonify([log.to_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

