from flask import Blueprint, request, jsonify
from extensions import db
from models.rubro import Rubro
from models.log_transaccional import LogTransaccional
import json

rubro_bp = Blueprint('rubro', __name__, url_prefix='/api/rubros')


@rubro_bp.route('/', methods=['POST'])
def crear_rubro():
	try:
		data = request.get_json()
		nuevo = Rubro(
			id_nomina=data['id_nomina'],
			codigo=data.get('codigo'),
			descripcion=data.get('descripcion'),
			tipo=data['tipo'],
			monto=data.get('monto', 0.0),
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
				usuario=str(data.get('creado_por', 'sistema')),
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
			print(f"⚠️ Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Rubro creado', 'id': nuevo.id_rubro}), 201
	except Exception as e:
		db.session.rollback()
		return jsonify({'error': f'Error al crear rubro: {str(e)}'}), 500


@rubro_bp.route('/', methods=['GET'])
def listar_rubros():
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
def obtener_rubro(id):
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
def actualizar_rubro(id):
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
				usuario=str(data.get('modificado_por', 'sistema')),
				datos_anteriores=json.dumps(datos_anteriores),
				datos_nuevos=json.dumps(datos_nuevos)
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f"⚠️ Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Rubro actualizado'}), 200
	except Exception as error:
		db.session.rollback()
		return jsonify({'error': f'Error al actualizar rubro: {str(error)}'}), 500


@rubro_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_rubro(id):
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
				usuario='sistema',
				datos_anteriores=json.dumps(datos_anteriores)
			)
			db.session.add(log)
			db.session.commit()
		except Exception as log_error:
			print(f"⚠️ Error al registrar log: {log_error}")

		return jsonify({'mensaje': 'Rubro eliminado'}), 200
	except Exception as error:
		db.session.rollback()
		return jsonify({'error': f'Error al eliminar rubro: {str(error)}'}), 500

