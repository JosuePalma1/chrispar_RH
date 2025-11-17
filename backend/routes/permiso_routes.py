from flask import Blueprint, request, jsonify
from extensions import db
from models.permiso import Permiso
from models.log_transaccional import LogTransaccional
import json

permiso_bp = Blueprint("permiso", __name__, url_prefix="/api/permisos")

@permiso_bp.route("/", methods=["POST"])
def crear_permiso():
    try:
        data = request.get_json()
        
        nuevo = Permiso(
            id_empleado=data["id_empleado"],
            tipo=data["tipo"],
            descripcion=data.get("descripcion"),
            fecha_inicio=data["fecha_inicio"],
            fecha_fin=data["fecha_fin"],
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
                usuario=str(data.get('creado_por', 'sistema')),
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
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Permiso creado", "id": nuevo.id_permiso}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear permiso: {str(e)}"}), 500


@permiso_bp.route("/", methods=["GET"])
def listar_permisos():
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
                "autorizado_por": p.autorizado_por
            })
        return jsonify(result), 200
    except Exception as error:
        return jsonify({"error": f"Error al listar permisos: {str(error)}"}), 500


@permiso_bp.route("/<int:id>", methods=["GET"])
def obtener_permiso(id):
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
def actualizar_permiso(id):
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
        p.fecha_inicio = data.get("fecha_inicio", p.fecha_inicio)
        p.fecha_fin = data.get("fecha_fin", p.fecha_fin)
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
                usuario=str(data.get('modificado_por', 'sistema')),
                datos_anteriores=json.dumps(datos_anteriores),
                datos_nuevos=json.dumps(datos_nuevos)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Permiso actualizado"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar permiso: {str(error)}"}), 500


@permiso_bp.route("/<int:id>", methods=["DELETE"])
def eliminar_permiso(id):
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
                usuario='sistema',
                datos_anteriores=json.dumps(datos_anteriores)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Permiso eliminado"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar permiso: {str(error)}"}), 500
