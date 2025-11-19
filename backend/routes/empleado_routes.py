from flask import Blueprint, request, jsonify
from extensions import db
from models.empleado import Empleado
from models.log_transaccional import LogTransaccional
from utils.auth import token_required
import json

empleado_bp = Blueprint("empleado", __name__, url_prefix="/api/empleados")

@empleado_bp.route("/", methods=["POST"])
@token_required
def crear_empleado(current_user):
    try:
        data = request.get_json()
        
        nuevo = Empleado(
            id_usuario=data.get("id_usuario"),
            id_cargo=data["id_cargo"],
            nombres=data.get("nombres"),
            apellidos=data.get("apellidos"),
            fecha_nacimiento=data.get("fecha_nacimiento"),
            cedula=data.get("cedula"),
            estado=data.get("estado", "activo"),
            fecha_ingreso=data.get("fecha_ingreso"),
            tipo_cuenta_bancaria=data.get("tipo_cuenta_bancaria"),
            numero_cuenta_bancaria=data.get("numero_cuenta_bancaria"),
            modalidad_fondo_reserva=data.get("modalidad_fondo_reserva"),
            modalidad_decimos=data.get("modalidad_decimos"),
            creado_por=data.get("creado_por")
        )
        
        db.session.add(nuevo)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='empleados',
                operacion='INSERT',
                id_registro=nuevo.id,
                usuario=str(data.get('creado_por', 'sistema')),
                datos_nuevos=json.dumps({
                    'nombres': nuevo.nombres,
                    'apellidos': nuevo.apellidos,
                    'cedula': nuevo.cedula,
                    'estado': nuevo.estado,
                    'id_cargo': nuevo.id_cargo,
                    'id_usuario': nuevo.id_usuario,
                    'fecha_ingreso': nuevo.fecha_ingreso.isoformat() if nuevo.fecha_ingreso else None
                })
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Empleado creado", "id": nuevo.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear empleado: {str(e)}"}), 500


@empleado_bp.route("/", methods=["GET"])
@token_required
def listar_empleados(current_user):
    try:
        empleados = Empleado.query.all()
        result = []
        for e in empleados:
            result.append({
                "id": e.id,
                "nombres": e.nombres,
                "apellidos": e.apellidos,
                "cedula": e.cedula,
                "cargo_id": e.id_cargo,
                "estado": e.estado
            })
        return jsonify(result), 200
    except Exception as error:
        return jsonify({"error": f"Error al listar empleados: {str(error)}"}), 500


@empleado_bp.route("/<int:id>", methods=["GET"])
@token_required
def obtener_empleado(current_user, id):
    try:
        e = Empleado.query.get_or_404(id)
        return jsonify({
            "id": e.id,
            "nombres": e.nombres,
            "apellidos": e.apellidos,
            "cedula": e.cedula,
            "estado": e.estado,
            "fecha_ingreso": e.fecha_ingreso.isoformat() if e.fecha_ingreso else None,
            "fecha_nacimiento": e.fecha_nacimiento.isoformat() if e.fecha_nacimiento else None,
            "cargo_id": e.id_cargo,
            "usuario_id": e.id_usuario,
            "tipo_cuenta_bancaria": e.tipo_cuenta_bancaria,
            "numero_cuenta_bancaria": e.numero_cuenta_bancaria,
            "modalidad_fondo_reserva": e.modalidad_fondo_reserva,
            "modalidad_decimos": e.modalidad_decimos
        }), 200
    except Exception as error:
        return jsonify({"error": f"Error al obtener empleado: {str(error)}"}), 500


@empleado_bp.route("/<int:id>", methods=["PUT"])
@token_required
def actualizar_empleado(current_user, id):
    try:
        data = request.get_json()
        e = Empleado.query.get_or_404(id)
        
        # Guardar datos anteriores para el log
        datos_anteriores = {
            'nombres': e.nombres,
            'apellidos': e.apellidos,
            'cedula': e.cedula,
            'estado': e.estado,
            'id_cargo': e.id_cargo,
            'id_usuario': e.id_usuario
        }
        
        # Actualizar campos
        e.nombres = data.get("nombres", e.nombres)
        e.apellidos = data.get("apellidos", e.apellidos)
        e.estado = data.get("estado", e.estado)
        e.cedula = data.get("cedula", e.cedula)
        e.id_cargo = data.get("id_cargo", e.id_cargo)
        e.id_usuario = data.get("id_usuario", e.id_usuario)
        e.tipo_cuenta_bancaria = data.get("tipo_cuenta_bancaria", e.tipo_cuenta_bancaria)
        e.numero_cuenta_bancaria = data.get("numero_cuenta_bancaria", e.numero_cuenta_bancaria)
        e.modalidad_fondo_reserva = data.get("modalidad_fondo_reserva", e.modalidad_fondo_reserva)
        e.modalidad_decimos = data.get("modalidad_decimos", e.modalidad_decimos)
        e.modificado_por = data.get("modificado_por")
        
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            datos_nuevos = {
                'nombres': e.nombres,
                'apellidos': e.apellidos,
                'cedula': e.cedula,
                'estado': e.estado,
                'id_cargo': e.id_cargo,
                'id_usuario': e.id_usuario
            }
            
            log = LogTransaccional(
                tabla_afectada='empleados',
                operacion='UPDATE',
                id_registro=e.id,
                usuario=str(data.get('modificado_por', 'sistema')),
                datos_anteriores=json.dumps(datos_anteriores),
                datos_nuevos=json.dumps(datos_nuevos)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Empleado actualizado"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar empleado: {str(error)}"}), 500


@empleado_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def eliminar_empleado(current_user, id):
    try:
        e = Empleado.query.get_or_404(id)
        
        # Guardar datos antes de eliminar
        datos_anteriores = {
            'nombres': e.nombres,
            'apellidos': e.apellidos,
            'cedula': e.cedula,
            'estado': e.estado,
            'id_cargo': e.id_cargo,
            'id_usuario': e.id_usuario
        }
        empleado_id = e.id
        
        db.session.delete(e)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='empleados',
                operacion='DELETE',
                id_registro=empleado_id,
                usuario='sistema',
                datos_anteriores=json.dumps(datos_anteriores)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Empleado eliminado"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar empleado: {str(error)}"}), 500