from flask import Blueprint, request, jsonify
from extensions import db
from models.nomina import Nomina
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
from utils.parsers import parse_date
import json

nomina_bp = Blueprint('nomina', __name__, url_prefix='/api/nominas')


@nomina_bp.route('/', methods=['POST'])
@admin_required
def crear_nomina(current_user):
	try:
		data = request.get_json()
		fecha_inicio = parse_date(data.get('fecha_inicio'))
		fecha_fin = parse_date(data.get('fecha_fin'))

		if not fecha_inicio or not fecha_fin:
			return jsonify({'error': 'fecha_inicio y fecha_fin válidas son requeridas'}), 400

		nuevo = Nomina(
			id_empleado=data['id_empleado'],
			fecha_inicio=fecha_inicio,
			fecha_fin=fecha_fin,
			total=data.get('total', 0.0),
			estado=data.get('estado', 'pendiente'),
			creado_por=data.get('creado_por')
		)
		db.session.add(nuevo)
		db.session.commit()

		# Registrar log
		try:
			log = LogTransaccional(
				tabla_afectada='nominas',
				operacion='INSERT',
				id_registro=nuevo.id_nomina,
				usuario=current_user.username,
				datos_nuevos=json.dumps({
					'id_empleado': nuevo.id_empleado,
					'fecha_inicio': str(nuevo.fecha_inicio),
					'fecha_fin': str(nuevo.fecha_fin),
					'total': nuevo.total,
					'estado': nuevo.estado
				})
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Nómina creada', 'id': nuevo.id_nomina}), 201
	except Exception as e:
		db.session.rollback()
		return jsonify({'error': f'Error al crear nómina: {str(e)}'}), 500


@nomina_bp.route('/', methods=['GET'])
@token_required
def listar_nominas(current_user):
	try:
		id_empleado = request.args.get('id_empleado')
		query = Nomina.query
		if id_empleado:
			query = query.filter_by(id_empleado=int(id_empleado))
		nominas = query.all()
		result = []
		for n in nominas:
			result.append({
				'id_nomina': n.id_nomina,
				'id_empleado': n.id_empleado,
				'fecha_inicio': n.fecha_inicio.isoformat() if n.fecha_inicio else None,
				'fecha_fin': n.fecha_fin.isoformat() if n.fecha_fin else None,
				'total': n.total,
				'estado': n.estado
			})
		return jsonify(result), 200
	except Exception as error:
		return jsonify({'error': f'Error al listar nóminas: {str(error)}'}), 500


@nomina_bp.route('/<int:id>', methods=['GET'])
@token_required
def obtener_nomina(current_user, id):
	try:
		n = Nomina.query.get_or_404(id)
		return jsonify({
			'id_nomina': n.id_nomina,
			'id_empleado': n.id_empleado,
			'fecha_inicio': n.fecha_inicio.isoformat() if n.fecha_inicio else None,
			'fecha_fin': n.fecha_fin.isoformat() if n.fecha_fin else None,
			'total': n.total,
			'estado': n.estado,
			'fecha_creacion': n.fecha_creacion.isoformat() if n.fecha_creacion else None,
			'fecha_actualizacion': n.fecha_actualizacion.isoformat() if n.fecha_actualizacion else None
		}), 200
	except Exception as error:
		return jsonify({'error': f'Error al obtener nómina: {str(error)}'}), 500


@nomina_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def actualizar_nomina(current_user, id):
	try:
		data = request.get_json()
		n = Nomina.query.get_or_404(id)

		datos_anteriores = {
			'total': n.total,
			'estado': n.estado
		}

		fecha_inicio = parse_date(data.get('fecha_inicio', n.fecha_inicio))
		fecha_fin = parse_date(data.get('fecha_fin', n.fecha_fin))
		n.fecha_inicio = fecha_inicio if fecha_inicio else n.fecha_inicio
		n.fecha_fin = fecha_fin if fecha_fin else n.fecha_fin
		n.total = data.get('total', n.total)
		n.estado = data.get('estado', n.estado)
		n.modificado_por = data.get('modificado_por')

		db.session.commit()

		# Registrar log
		try:
			datos_nuevos = {'total': n.total, 'estado': n.estado}
			log = LogTransaccional(
				tabla_afectada='nominas',
				operacion='UPDATE',
				id_registro=n.id_nomina,
				usuario=current_user.username,
				datos_anteriores=json.dumps(datos_anteriores),
				datos_nuevos=json.dumps(datos_nuevos)
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Nómina actualizada'}), 200
	except Exception as error:
		db.session.rollback()
		return jsonify({'error': f'Error al actualizar nómina: {str(error)}'}), 500


@nomina_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def eliminar_nomina(current_user, id):
	try:
		n = Nomina.query.get_or_404(id)
		datos_anteriores = {
			'id_empleado': n.id_empleado,
			'fecha_inicio': n.fecha_inicio.isoformat() if n.fecha_inicio else None,
			'fecha_fin': n.fecha_fin.isoformat() if n.fecha_fin else None,
			'total': n.total,
			'estado': n.estado
		}
		nomina_id = n.id_nomina

		db.session.delete(n)
		db.session.commit()

		# Registrar log
		try:
			log = LogTransaccional(
				tabla_afectada='nominas',
				operacion='DELETE',
				id_registro=nomina_id,
				usuario=current_user.username,
				datos_anteriores=json.dumps(datos_anteriores)
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Nómina eliminada'}), 200
	except Exception as error:
		db.session.rollback()
		return jsonify({'error': f'Error al eliminar nómina: {str(error)}'}), 500

