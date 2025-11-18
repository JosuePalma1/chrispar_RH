from flask import Blueprint, request, jsonify
from extensions import db
from models.asistencia import Asistencia
from models.log_transaccional import LogTransaccional
import json

asistencia_bp = Blueprint("asistencia", __name__, url_prefix="/api/asistencias")

@asistencia_bp.route("/", methods=["POST"])
def crear_asistencia():
    try:
        data = request.get_json()
        
        nueva = Asistencia(
            id_empleado=data["id_empleado"],
            fecha=data["fecha"],
            hora_entrada=data["hora_entrada"],
            hora_salida=data.get("hora_salida"),
            horas_extra=data.get("horas_extra", 0.0),
            creado_por=data.get("creado_por")
        )
        
        db.session.add(nueva)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='asistencias',
                operacion='INSERT',
                id_registro=nueva.id_asistencia,
                usuario=str(data.get('creado_por', 'sistema')),
                datos_nuevos=json.dumps({
                    'id_empleado': nueva.id_empleado,
                    'fecha': nueva.fecha.isoformat(),
                    'hora_entrada': str(nueva.hora_entrada),
                    'hora_salida': str(nueva.hora_salida) if nueva.hora_salida else None,
                    'horas_extra': nueva.horas_extra
                })
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Asistencia creada", "id": nueva.id_asistencia}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear asistencia: {str(e)}"}), 500


@asistencia_bp.route("/", methods=["GET"])
def listar_asistencias():
    try:
        # Filtrar por id_empleado si se proporciona
        id_empleado = request.args.get("id_empleado")
        
        if id_empleado:
            asistencias = Asistencia.query.filter_by(id_empleado=int(id_empleado)).all()
        else:
            asistencias = Asistencia.query.all()
        
        result = []
        for a in asistencias:
            result.append({
                "id_asistencia": a.id_asistencia,
                "id_empleado": a.id_empleado,
                "fecha": a.fecha.isoformat(),
                "hora_entrada": str(a.hora_entrada),
                "hora_salida": str(a.hora_salida) if a.hora_salida else None,
                "horas_extra": a.horas_extra
            })
        return jsonify(result), 200
    except Exception as error:
        return jsonify({"error": f"Error al listar asistencias: {str(error)}"}), 500


@asistencia_bp.route("/<int:id>", methods=["GET"])
def obtener_asistencia(id):
    try:
        a = Asistencia.query.get_or_404(id)
        return jsonify({
            "id_asistencia": a.id_asistencia,
            "id_empleado": a.id_empleado,
            "fecha": a.fecha.isoformat(),
            "hora_entrada": str(a.hora_entrada),
            "hora_salida": str(a.hora_salida) if a.hora_salida else None,
            "horas_extra": a.horas_extra,
            "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None,
            "fecha_actualizacion": a.fecha_actualizacion.isoformat() if a.fecha_actualizacion else None
        }), 200
    except Exception as error:
        return jsonify({"error": f"Error al obtener asistencia: {str(error)}"}), 500


@asistencia_bp.route("/<int:id>", methods=["PUT"])
def actualizar_asistencia(id):
    try:
        data = request.get_json()
        a = Asistencia.query.get_or_404(id)
        
        # Guardar datos anteriores para el log
        datos_anteriores = {
            'hora_entrada': str(a.hora_entrada),
            'hora_salida': str(a.hora_salida) if a.hora_salida else None,
            'horas_extra': a.horas_extra
        }
        
        # Actualizar campos
        a.hora_entrada = data.get("hora_entrada", a.hora_entrada)
        a.hora_salida = data.get("hora_salida", a.hora_salida)
        a.horas_extra = data.get("horas_extra", a.horas_extra)
        a.modificado_por = data.get("modificado_por")
        
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            datos_nuevos = {
                'hora_entrada': str(a.hora_entrada),
                'hora_salida': str(a.hora_salida) if a.hora_salida else None,
                'horas_extra': a.horas_extra
            }
            
            log = LogTransaccional(
                tabla_afectada='asistencias',
                operacion='UPDATE',
                id_registro=a.id_asistencia,
                usuario=str(data.get('modificado_por', 'sistema')),
                datos_anteriores=json.dumps(datos_anteriores),
                datos_nuevos=json.dumps(datos_nuevos)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Asistencia actualizada"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar asistencia: {str(error)}"}), 500


@asistencia_bp.route("/<int:id>", methods=["DELETE"])
def eliminar_asistencia(id):
    try:
        a = Asistencia.query.get_or_404(id)
        
        # Guardar datos antes de eliminar
        datos_anteriores = {
            'id_empleado': a.id_empleado,
            'fecha': a.fecha.isoformat(),
            'hora_entrada': str(a.hora_entrada),
            'hora_salida': str(a.hora_salida) if a.hora_salida else None,
            'horas_extra': a.horas_extra
        }
        asistencia_id = a.id_asistencia
        
        db.session.delete(a)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='asistencias',
                operacion='DELETE',
                id_registro=asistencia_id,
                usuario='sistema',
                datos_anteriores=json.dumps(datos_anteriores)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Asistencia eliminada"}), 200
        
    except Exception as error:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar asistencia: {str(error)}"}), 500
