from flask import Blueprint, request, jsonify
from extensions import db
from models.rubro import Rubro
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
import json

rubro_bp = Blueprint('rubro', __name__, url_prefix='/api/rubros')


@rubro_bp.route('/', methods=['POST'])
@admin_required
def crear_rubro(current_user):
	try:
		data = request.get_json()
		
		# Validaciones de campos requeridos
		if not data.get('id_nomina'):
			return jsonify({'error': 'La nómina es requerida'}), 400
		
		if not data.get('tipo'):
			return jsonify({'error': 'El tipo de rubro es requerido'}), 400
		
		if data.get('tipo') not in ['devengo', 'deduccion', 'egreso', 'ingreso']:
			return jsonify({'error': 'El tipo debe ser: devengo, deduccion, egreso o ingreso'}), 400
		
		try:
			monto = float(data.get('monto', 0.0))
			if monto < 0:
				return jsonify({'error': 'El monto no puede ser negativo'}), 400
		except ValueError:
			return jsonify({'error': 'El monto debe ser un número válido'}), 400
		
		nuevo = Rubro(
			id_nomina=data['id_nomina'],
			codigo=data.get('codigo'),
			descripcion=data.get('descripcion'),
			tipo=data['tipo'],
			monto=monto,
			creado_por=data.get('creado_por')
		)
		db.session.add(nuevo)
		db.session.commit()

		# Registrar log
		try:
			log = LogTransaccional(
				tabla_afectada='rubros',
				operacion='INSERT',
				id_registro=nuevo.id_rubro,
				usuario=current_user.username,
				datos_nuevos=json.dumps({
					'id_nomina': nuevo.id_nomina,
					'codigo': nuevo.codigo,
					'descripcion': nuevo.descripcion,
					'tipo': nuevo.tipo,
					'monto': nuevo.monto
				})
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Rubro creado', 'id_rubro': nuevo.id_rubro, 'id': nuevo.id_rubro}), 201
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
			return jsonify({'error': 'La nómina especificada no existe'}), 400
		elif 'not null constraint' in error_msg.lower():
			return jsonify({'error': 'Faltan campos obligatorios en el formulario'}), 400
		elif 'unique constraint' in error_msg.lower():
			return jsonify({'error': 'Ya existe un rubro con este código'}), 400
		else:
			return jsonify({'error': 'Error al crear el rubro. Verifica los datos ingresados'}), 500


@rubro_bp.route('/', methods=['GET'])
@token_required
def listar_rubros(current_user):
	try:
		id_nomina = request.args.get('id_nomina')
		query = Rubro.query
		if id_nomina:
			query = query.filter_by(id_nomina=int(id_nomina))
		rubros = query.all()
		result = []
		for r in rubros:
			result.append({
				'id_rubro': r.id_rubro,
				'id_nomina': r.id_nomina,
				'codigo': r.codigo,
				'descripcion': r.descripcion,
				'tipo': r.tipo,
				'monto': r.monto
			})
		return jsonify(result), 200
	except Exception as error:
		return jsonify({'error': f'Error al listar rubros: {str(error)}'}), 500


@rubro_bp.route('/<int:id>', methods=['GET'])
@token_required
def obtener_rubro(current_user, id):
	try:
		r = Rubro.query.get_or_404(id)
		return jsonify({
			'id_rubro': r.id_rubro,
			'id_nomina': r.id_nomina,
			'codigo': r.codigo,
			'descripcion': r.descripcion,
			'tipo': r.tipo,
			'monto': r.monto,
			'fecha_creacion': r.fecha_creacion.isoformat() if r.fecha_creacion else None,
			'fecha_actualizacion': r.fecha_actualizacion.isoformat() if r.fecha_actualizacion else None
		}), 200
	except Exception as error:
		return jsonify({'error': f'Error al obtener rubro: {str(error)}'}), 500


@rubro_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def actualizar_rubro(current_user, id):
	try:
		data = request.get_json()
		r = Rubro.query.get_or_404(id)

		datos_anteriores = {'monto': r.monto, 'tipo': r.tipo}

		r.codigo = data.get('codigo', r.codigo)
		r.descripcion = data.get('descripcion', r.descripcion)
		r.tipo = data.get('tipo', r.tipo)
		r.monto = data.get('monto', r.monto)
		r.modificado_por = data.get('modificado_por')

		db.session.commit()

		# Registrar log
		try:
			datos_nuevos = {'monto': r.monto, 'tipo': r.tipo}
			log = LogTransaccional(
				tabla_afectada='rubros',
				operacion='UPDATE',
				id_registro=r.id_rubro,
				usuario=current_user.username,
				datos_anteriores=json.dumps(datos_anteriores),
				datos_nuevos=json.dumps(datos_nuevos)
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Rubro actualizado'}), 200
	except ValueError as e:
		db.session.rollback()
		return jsonify({'error': f'Valor inválido: {str(e)}'}), 400
	except Exception as error:
		db.session.rollback()
		error_msg = str(error)
		if 'foreign key constraint' in error_msg.lower():
			return jsonify({'error': 'La nómina especificada no existe'}), 400
		elif 'not null constraint' in error_msg.lower():
			return jsonify({'error': 'Faltan campos obligatorios'}), 400
		elif 'unique constraint' in error_msg.lower():
			return jsonify({'error': 'Ya existe un rubro con este código'}), 400
		else:
			return jsonify({'error': 'Error al actualizar el rubro. Verifica los datos'}), 500


@rubro_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def eliminar_rubro(current_user, id):
	try:
		r = Rubro.query.get_or_404(id)
		datos_anteriores = {
			'id_nomina': r.id_nomina,
			'codigo': r.codigo,
			'descripcion': r.descripcion,
			'tipo': r.tipo,
			'monto': r.monto
		}
		rubro_id = r.id_rubro

		db.session.delete(r)
		db.session.commit()

		# Registrar log
		try:
			log = LogTransaccional(
				tabla_afectada='rubros',
				operacion='DELETE',
				id_registro=rubro_id,
				usuario=current_user.username,
				datos_anteriores=json.dumps(datos_anteriores)
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f" Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Rubro eliminado'}), 200
	except Exception as error:
		db.session.rollback()
		return jsonify({'error': f'Error al eliminar rubro: {str(error)}'}), 500

