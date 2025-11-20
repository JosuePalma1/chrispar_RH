from flask import Blueprint, request, jsonify
from extensions import db
from models.horario import Horario
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
from utils.parsers import parse_date, parse_time
import json

horario_bp = Blueprint('horario', __name__, url_prefix='/api/horarios')

# CREATE - Crear [cite: 37-49]
@horario_bp.route("/", methods=["POST"])
@admin_required
def crear_horario(current_user):
    data = request.get_json()
    
    # Validación básica
    if "id_empleado" not in data:
        return jsonify({"error": "id_empleado es requerido"}), 400

    nuevo_horario = Horario(
        id_empleado=data["id_empleado"],
        dia_laborables=data.get("dia_laborables"),
        fecha_inicio=parse_date(data.get("fecha_inicio")),
        hora_entrada=parse_time(data.get("hora_entrada")),
        hora_salida=parse_time(data.get("hora_salida")),
        descanso_minutos=data.get("descanso_minutos"),
        turno=data.get("turno"),
        inicio_vigencia=parse_date(data.get("inicio_vigencia")),
        fin_vigencia=parse_date(data.get("fin_vigencia")),
        creado_por=data.get("creado_por") # Asumir que el ID del usuario viene del frontend
    )
    
    db.session.add(nuevo_horario)
    db.session.commit()

    # REGISTRAR LOG
    try:
        log = LogTransaccional(
            tabla_afectada='horarios',
            operacion='INSERT',
            id_registro=nuevo_horario.id_horario,
            usuario=str(data.get('creado_por', 'sistema')),
            datos_nuevos=json.dumps({
                'id_empleado': nuevo_horario.id_empleado,
                'dia_laborables': nuevo_horario.dia_laborables,
                'turno': nuevo_horario.turno,
                'hora_entrada': str(nuevo_horario.hora_entrada) if nuevo_horario.hora_entrada else None,
                'hora_salida': str(nuevo_horario.hora_salida) if nuevo_horario.hora_salida else None
            })
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_error:
        print(f" Error al registrar log: {log_error}")
    
    return jsonify({
        "mensaje": "Horario creado exitosamente", 
        "horario": nuevo_horario.to_dict()
    }), 201

# READ - Listar todos [cite: 50-61]
@horario_bp.route("/", methods=["GET"])
@token_required
def listar_horarios(current_user):
    horarios = Horario.query.all()
    return jsonify([h.to_dict() for h in horarios])

# READ - Obtener uno [cite: 62-70]
@horario_bp.route("/<int:id_horario>", methods=["GET"])
@token_required
def obtener_horario(current_user, id_horario):
    horario = Horario.query.get_or_404(id_horario)
    return jsonify(horario.to_dict())

# UPDATE - Actualizar [cite: 71-79]
@horario_bp.route("/<int:id_horario>", methods=["PUT"])
@admin_required
def actualizar_horario(current_user, id_horario):
    horario = Horario.query.get_or_404(id_horario)
    data = request.get_json()

    # Guardar datos anteriores para el log
    datos_anteriores = {
        'dia_laborables': horario.dia_laborables,
        'turno': horario.turno,
        'hora_entrada': str(horario.hora_entrada) if horario.hora_entrada else None,
        'hora_salida': str(horario.hora_salida) if horario.hora_salida else None
    }
    horario.dia_laborables = data.get("dia_laborables", horario.dia_laborables)
    horario.fecha_inicio = parse_date(data.get("fecha_inicio", horario.fecha_inicio))
    horario.hora_entrada = parse_time(data.get("hora_entrada", horario.hora_entrada))
    horario.hora_salida = parse_time(data.get("hora_salida", horario.hora_salida))
    horario.descanso_minutos = data.get("descanso_minutos", horario.descanso_minutos)
    horario.turno = data.get("turno", horario.turno)
    horario.inicio_vigencia = parse_date(data.get("inicio_vigencia", horario.inicio_vigencia))
    horario.fin_vigencia = parse_date(data.get("fin_vigencia", horario.fin_vigencia))
    horario.modificado_por = data.get("modificado_por") # Asumir ID de usuario
    # 'id_empleado' no debería cambiarse en un update, se crea uno nuevo.

    db.session.commit()

    # REGISTRAR LOG
    try:
        datos_nuevos = {
            'dia_laborables': horario.dia_laborables,
            'turno': horario.turno,
            'hora_entrada': str(horario.hora_entrada) if horario.hora_entrada else None,
            'hora_salida': str(horario.hora_salida) if horario.hora_salida else None
        }
        
        log = LogTransaccional(
            tabla_afectada='horarios',
            operacion='UPDATE',
            id_registro=horario.id_horario,
            usuario=str(data.get('modificado_por', 'sistema')),
            datos_anteriores=json.dumps(datos_anteriores),
            datos_nuevos=json.dumps(datos_nuevos)
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_error:
        print(f" Error al registrar log: {log_error}")
    
    return jsonify({
        "mensaje": "Horario actualizado exitosamente",
        "horario": horario.to_dict()
    })

# DELETE - Eliminar [cite: 80-86]
@horario_bp.route("/<int:id_horario>", methods=["DELETE"])
@admin_required
def eliminar_horario(current_user, id_horario):
    horario = Horario.query.get_or_404(id_horario)

    # Guardar datos antes de eliminar
    datos_anteriores = {
        'id_empleado': horario.id_empleado,
        'dia_laborables': horario.dia_laborables,
        'turno': horario.turno,
        'hora_entrada': str(horario.hora_entrada) if horario.hora_entrada else None,
        'hora_salida': str(horario.hora_salida) if horario.hora_salida else None
    }
    horario_id = horario.id_horario
    
    db.session.delete(horario)
    db.session.commit()

    # REGISTRAR LOG
    try:
        log = LogTransaccional(
            tabla_afectada='horarios',
            operacion='DELETE',
            id_registro=horario_id,
            usuario='sistema',
            datos_anteriores=json.dumps(datos_anteriores)
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_error:
        print(f" Error al registrar log: {log_error}")
    
    return jsonify({"mensaje": "Horario eliminado exitosamente"})