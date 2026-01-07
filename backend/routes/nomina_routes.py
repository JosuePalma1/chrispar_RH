from flask import Blueprint, request, jsonify
from extensions import db
from models.nomina import Nomina
from models.empleado import Empleado
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
from utils.parsers import parse_date
import json
from sqlalchemy.exc import IntegrityError
from datetime import datetime


def _fecha_generacion_val(n):
	return getattr(n, 'fecha_generacion', None)


def _total_val(n):
	return getattr(n, 'total', None) or getattr(n, 'total_desembolsar', None) or 0.0


nomina_bp = Blueprint('nomina', __name__, url_prefix='/api/nominas')


@nomina_bp.route('/', methods=['POST'])
@token_required
def crear_nomina(current_user):
	try:
		data = request.get_json() or {}

		# Validaciones de campos requeridos y tipos
		id_empleado = data.get('id_empleado')
		if id_empleado in (None, ''):
			return jsonify({'error': 'El empleado es requerido', 'field': 'id_empleado'}), 400
		try:
			id_empleado = int(id_empleado)
		except Exception:
			return jsonify({'error': 'id_empleado debe ser un entero', 'field': 'id_empleado'}), 400

		# Verificar que el empleado exista
		emp = Empleado.query.get(id_empleado)
		if not emp:
			return jsonify({'error': 'Empleado no encontrado', 'field': 'id_empleado'}), 400

		# Allow creation by month string 'YYYY-MM' or a single fecha_generacion date
		mes_input = data.get('mes')
		fecha_generacion = None
		if mes_input:
			try:
				_datetime_obj = datetime.strptime(mes_input, "%Y-%m")
				fecha_generacion = _datetime_obj.date().replace(day=1)
			except Exception:
				return jsonify({'error': 'Formato de mes inválido, use YYYY-MM', 'field': 'mes'}), 400
		else:
			fecha_generacion = parse_date(data.get('fecha_generacion') or data.get('fecha'))

		if not fecha_generacion and not mes_input:
			return jsonify({'error': 'La fecha de generación (mes o fecha_generacion) es requerida', 'field': 'mes'}), 400

		mes_val = mes_input or (fecha_generacion.strftime('%Y-%m') if fecha_generacion else None)

		# Validar campos numéricos
		def _parse_nonneg_float(val, field_name):
			if val is None or val == '':
				return 0.0
			try:
				f = float(val)
			except Exception:
				raise ValueError(f"Campo {field_name} debe ser numérico")
			if f < 0:
				raise ValueError(f"Campo {field_name} no puede ser negativo")
			return f

		sueldo_base = _parse_nonneg_float(data.get('sueldo_base', 0.0), 'sueldo_base')
		horas_extra = _parse_nonneg_float(data.get('horas_extra', 0.0), 'horas_extra')
		total_desembolsar = _parse_nonneg_float(data.get('total_desembolsar', data.get('total', 0.0)), 'total_desembolsar')

		nuevo = Nomina(
			id_empleado=id_empleado,
			mes=mes_val,
			fecha_generacion=fecha_generacion,
			sueldo_base=sueldo_base,
			horas_extra=horas_extra,
			total_desembolsar=total_desembolsar,
			creado_por=(data.get('creado_por') if data.get('creado_por') is not None else getattr(current_user, 'id', None))
		)
		db.session.add(nuevo)
		try:
			db.session.commit()
		except IntegrityError as ie:
			db.session.rollback()
			# proporcionar mensaje más preciso al frontend
			msg = str(ie.orig) if getattr(ie, 'orig', None) else str(ie)
			if 'foreign key' in msg.lower():
				return jsonify({'error': 'El empleado especificado no existe', 'detail': msg}), 400
			if 'not null' in msg.lower():
				return jsonify({'error': 'Faltan campos obligatorios', 'detail': msg}), 400
			return jsonify({'error': 'Error de integridad en la base de datos', 'detail': msg}), 400

		# Registrar log
		try:
			log = LogTransaccional(
				tabla_afectada='nominas',
				operacion='INSERT',
				id_registro=nuevo.id_nomina,
				usuario=current_user.username,
				datos_nuevos=json.dumps({
					'id_empleado': nuevo.id_empleado,
					'mes': nuevo.mes,
					'fecha_generacion': nuevo.fecha_generacion.isoformat() if nuevo.fecha_generacion else None,
					'sueldo_base': nuevo.sueldo_base,
					'horas_extra': nuevo.horas_extra,
					'total_desembolsar': nuevo.total_desembolsar
				})
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Nómina creada', 'id': nuevo.id_nomina}), 201
	except KeyError as e:
		db.session.rollback()
		return jsonify({'error': f'Campo requerido faltante: {str(e)}'}), 400
	except ValueError as e:
		db.session.rollback()
		return jsonify({'error': f'Valor inválido: {str(e)}'}), 400
	except Exception as e:
		db.session.rollback()
		error_msg = str(e)
		if 'foreign key constraint' in error_msg.lower():
			return jsonify({'error': 'El empleado especificado no existe'}), 400
		elif 'not null constraint' in error_msg.lower():
			return jsonify({'error': 'Faltan campos obligatorios en el formulario'}), 400
		elif 'unique constraint' in error_msg.lower():
			return jsonify({'error': 'Ya existe una nómina con estos datos'}), 400
		else:
			return jsonify({'error': 'Error al crear la nómina. Verifica los datos ingresados'}), 500


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
			fi = _fecha_generacion_val(n)
			result.append({
				'id_nomina': n.id_nomina,
				'id_empleado': n.id_empleado,
				'mes': n.mes,
				'fecha_generacion': fi.isoformat() if fi else None,
				'sueldo_base': n.sueldo_base,
				'horas_extra': n.horas_extra,
				'total_desembolsar': _total_val(n)
			})
		return jsonify(result), 200
	except Exception as error:
		return jsonify({'error': f'Error al listar nóminas: {str(error)}'}), 500


@nomina_bp.route('/<int:id>', methods=['GET'])
@token_required
def obtener_nomina(current_user, id):
	try:
		n = Nomina.query.get_or_404(id)
		fi = _fecha_generacion_val(n)
		return jsonify({
			'id_nomina': n.id_nomina,
			'id_empleado': n.id_empleado,
			'mes': n.mes,
			'fecha_generacion': fi.isoformat() if fi else None,
			'sueldo_base': n.sueldo_base,
			'horas_extra': n.horas_extra,
			'total_desembolsar': _total_val(n)
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
			'sueldo_base': n.sueldo_base,
			'horas_extra': n.horas_extra,
			'total_desembolsar': _total_val(n)
		}

		# Map updates to existing DB columns when required
		if data.get('mes') is not None:
			try:
				_datetime_obj = datetime.strptime(data.get('mes'), "%Y-%m")
				n.mes = data.get('mes')
				n.fecha_generacion = _datetime_obj.date().replace(day=1)
			except Exception:
				return jsonify({'error': 'Formato de mes inválido, use YYYY-MM', 'field': 'mes'}), 400

		if data.get('fecha_generacion') is not None:
			fg = parse_date(data.get('fecha_generacion'))
			if fg:
				n.fecha_generacion = fg
				n.mes = fg.strftime('%Y-%m')

		if data.get('sueldo_base') is not None:
			n.sueldo_base = float(data.get('sueldo_base'))
		if data.get('horas_extra') is not None:
			n.horas_extra = float(data.get('horas_extra'))
		if data.get('total_desembolsar') is not None or data.get('total') is not None:
			n.total_desembolsar = float(data.get('total_desembolsar') or data.get('total'))

		n.modificado_por = data.get('modificado_por')

		db.session.commit()

		# Registrar log
		try:
			datos_nuevos = {'sueldo_base': n.sueldo_base, 'horas_extra': n.horas_extra, 'total_desembolsar': _total_val(n)}
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
	except ValueError as e:
		db.session.rollback()
		return jsonify({'error': f'Valor inválido: {str(e)}'}), 400
	except Exception as error:
		db.session.rollback()
		error_msg = str(error)
		if 'foreign key constraint' in error_msg.lower():
			return jsonify({'error': 'El empleado especificado no existe'}), 400
		elif 'not null constraint' in error_msg.lower():
			return jsonify({'error': 'Faltan campos obligatorios'}), 400
		else:
			return jsonify({'error': 'Error al actualizar la nómina. Verifica los datos'}), 500


@nomina_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def eliminar_nomina(current_user, id):
	try:
		n = Nomina.query.get_or_404(id)
		datos_anteriores = {
			'id_empleado': n.id_empleado,
			'mes': n.mes,
			'fecha_generacion': (_fecha_generacion_val(n).isoformat() if _fecha_generacion_val(n) else None),
			'total_desembolsar': _total_val(n)
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

