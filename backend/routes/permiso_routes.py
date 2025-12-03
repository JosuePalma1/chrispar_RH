from flask import Blueprint, request, jsonify
from extensions import db
from models.permiso import Permiso
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
from utils.parsers import parse_date
import json

permiso_bp = Blueprint("permiso", __name__, url_prefix="/api/permisos")

@permiso_bp.route("/", methods=["POST"])
@admin_required
def crear_permiso(current_user):
    try:
        data = request.get_json()
        
        fecha_inicio = parse_date(data.get("fecha_inicio"))
        fecha_fin = parse_date(data.get("fecha_fin"))

        if not fecha_inicio or not fecha_fin:
            return jsonify({"error": "fecha_inicio y fecha_fin válidas son requeridas"}), 400

        # Validar campos obligatorios
        if not data.get('id_empleado'):
            return jsonify({"error": "id_empleado es requerido"}), 400

        tipo = data.get('tipo')
        if not tipo or tipo not in ('permiso', 'vacaciones', 'licencia'):
            return jsonify({"error": "tipo inválido o faltante (permiso, vacaciones, licencia)"}), 400

        descripcion = data.get('descripcion')
        if not descripcion or not str(descripcion).strip():
            return jsonify({"error": "descripcion (motivo) es requerida"}), 400

        # Validar que fecha_fin no sea anterior a fecha_inicio
        if fecha_fin < fecha_inicio:
            return jsonify({"error": "fecha_fin no puede ser anterior a fecha_inicio"}), 400

        nuevo = Permiso(
            id_empleado=data["id_empleado"],
            tipo=data["tipo"],
            descripcion=data.get("descripcion"),
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=data.get("estado", "pendiente"),
            autorizado_por=data.get("autorizado_por"),
            creado_por=data.get("creado_por")
        )
        
        db.session.add(nuevo)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='permisos',
                operacion='INSERT',
                id_registro=nuevo.id_permiso,
                usuario=current_user.username,
                datos_nuevos=json.dumps({
                    'id_empleado': nuevo.id_empleado,
                    'tipo': nuevo.tipo,
                    'descripcion': nuevo.descripcion,
                    'fecha_inicio': nuevo.fecha_inicio.isoformat(),
                    'fecha_fin': nuevo.fecha_fin.isoformat(),
                    'estado': nuevo.estado,
                    'autorizado_por': nuevo.autorizado_por
                })
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Permiso creado", "id": nuevo.id_permiso}), 201
        
    except KeyError as e:
        db.session.rollback()
        return jsonify({"error": f"Campo requerido faltante: {str(e)}"}), 400
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Valor inválido: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        error_msg = str(e)
        if 'foreign key constraint' in error_msg.lower():
            return jsonify({"error": "El empleado especificado no existe"}), 400
        elif 'not null constraint' in error_msg.lower():
            return jsonify({"error": "Faltan campos obligatorios en el formulario"}), 400
        else:
            return jsonify({"error": "Error al crear el permiso. Verifica los datos ingresados"}), 500


@permiso_bp.route("/", methods=["GET"])
@token_required
def listar_permisos(current_user):
    try:
        # Filtrar por id_empleado si se proporciona
        id_empleado = request.args.get("id_empleado")
        estado = request.args.get("estado")
        
        query = Permiso.query
        
        if id_empleado:
            query = query.filter_by(id_empleado=int(id_empleado))
        
        if estado:
            query = query.filter_by(estado=estado)
        
        permisos = query.all()
        
        result = []
        for p in permisos:
            result.append({
                "id_permiso": p.id_permiso,
                "id_empleado": p.id_empleado,
                "tipo": p.tipo,
                "descripcion": p.descripcion,
                "fecha_inicio": p.fecha_inicio.isoformat(),
                "fecha_fin": p.fecha_fin.isoformat(),
                "estado": p.estado,
                "autorizado_por": p.autorizado_por,
                "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
                "fecha_actualizacion": p.fecha_actualizacion.isoformat() if p.fecha_actualizacion else None,
                "creado_por": p.creado_por,
                "modificado_por": p.modificado_por
            })
        return jsonify(result), 200
    except Exception as error:
        return jsonify({"error": f"Error al listar permisos: {str(error)}"}), 500


@permiso_bp.route("/<int:id>", methods=["GET"])
@token_required
def obtener_permiso(current_user, id):
    try:
        p = Permiso.query.get_or_404(id)
        return jsonify({
            "id_permiso": p.id_permiso,
            "id_empleado": p.id_empleado,
            "tipo": p.tipo,
            "descripcion": p.descripcion,
            "fecha_inicio": p.fecha_inicio.isoformat(),
            "fecha_fin": p.fecha_fin.isoformat(),
            "estado": p.estado,
            "autorizado_por": p.autorizado_por,
            "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
            "fecha_actualizacion": p.fecha_actualizacion.isoformat() if p.fecha_actualizacion else None
        }), 200
    except Exception as error:
        return jsonify({"error": f"Error al obtener permiso: {str(error)}"}), 500


@permiso_bp.route("/<int:id>", methods=["PUT"])
@admin_required
def actualizar_permiso(current_user, id):
    try:
        data = request.get_json()
        p = Permiso.query.get_or_404(id)
        
        # Guardar datos anteriores para el log
        datos_anteriores = {
            'tipo': p.tipo,
            'estado': p.estado,
            'fecha_inicio': p.fecha_inicio.isoformat(),
            'fecha_fin': p.fecha_fin.isoformat(),
            'autorizado_por': p.autorizado_por
        }
        
        # Actualizar campos
        p.tipo = data.get("tipo", p.tipo)
        p.descripcion = data.get("descripcion", p.descripcion)
        # Validar tipo si se proporciona
        if 'tipo' in data and data.get('tipo') not in ('permiso', 'vacaciones', 'licencia'):
            return jsonify({"error": "tipo inválido (permiso, vacaciones, licencia)"}), 400

        # Manejo y validación de fechas
        fecha_inicio_input = data.get("fecha_inicio")
        fecha_fin_input = data.get("fecha_fin")

        fecha_inicio = parse_date(fecha_inicio_input) if fecha_inicio_input is not None else p.fecha_inicio
        fecha_fin = parse_date(fecha_fin_input) if fecha_fin_input is not None else p.fecha_fin

        if fecha_inicio is None or fecha_fin is None:
            return jsonify({"error": "fecha_inicio y fecha_fin válidas son requeridas"}), 400

        if fecha_fin < fecha_inicio:
            return jsonify({"error": "fecha_fin no puede ser anterior a fecha_inicio"}), 400

        p.fecha_inicio = fecha_inicio
        p.fecha_fin = fecha_fin
        p.estado = data.get("estado", p.estado)
        p.autorizado_por = data.get("autorizado_por", p.autorizado_por)
        p.modificado_por = data.get("modificado_por")
        
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            datos_nuevos = {
                'tipo': p.tipo,
                'estado': p.estado,
                'fecha_inicio': p.fecha_inicio.isoformat(),
                'fecha_fin': p.fecha_fin.isoformat(),
                'autorizado_por': p.autorizado_por
            }
            
            log = LogTransaccional(
                tabla_afectada='permisos',
                operacion='UPDATE',
                id_registro=p.id_permiso,
                usuario=current_user.username,
                datos_anteriores=json.dumps(datos_anteriores),
                datos_nuevos=json.dumps(datos_nuevos)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Permiso actualizado"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar permiso: {str(error)}"}), 500


@permiso_bp.route("/<int:id>", methods=["DELETE"])
@admin_required
def eliminar_permiso(current_user, id):
    try:
        p = Permiso.query.get_or_404(id)
        
        # Guardar datos antes de eliminar
        datos_anteriores = {
            'id_empleado': p.id_empleado,
            'tipo': p.tipo,
            'descripcion': p.descripcion,
            'fecha_inicio': p.fecha_inicio.isoformat(),
            'fecha_fin': p.fecha_fin.isoformat(),
            'estado': p.estado,
            'autorizado_por': p.autorizado_por
        }
        permiso_id = p.id_permiso
        
        db.session.delete(p)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='permisos',
                operacion='DELETE',
                id_registro=permiso_id,
                usuario=current_user.username,
                datos_anteriores=json.dumps(datos_anteriores)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Permiso eliminado"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar permiso: {str(error)}"}), 500
