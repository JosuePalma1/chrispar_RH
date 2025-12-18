from flask import Blueprint, request, jsonify
from extensions import db
from models.horario import Horario
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
from utils.parsers import parse_date, parse_time
import json

horario_bp = Blueprint('horario', __name__, url_prefix='/api/horarios')

# CREATE - Crear
@horario_bp.route("/", methods=["POST"])
@admin_required
def crear_horario(current_user):
    try:
        data = request.get_json()
        
        # Validaciones
        if not data.get('id_empleado'):
            return jsonify({"error": "El id_empleado es requerido"}), 400
        
        if not data.get("hora_entrada") or not data.get("hora_salida"):
            return jsonify({"error": "Las horas de entrada y salida son requeridas"}), 400

        hora_entrada = parse_time(data.get("hora_entrada"))
        hora_salida = parse_time(data.get("hora_salida"))
        if hora_entrada is None or hora_salida is None:
            return jsonify({"error": "Formato de hora inválido. Use HH:MM"}), 400
        if hora_entrada == hora_salida:
            return jsonify({"error": "La hora de entrada y la hora de salida no pueden ser iguales"}), 400

        nuevo_horario = Horario(
            id_empleado=data["id_empleado"],
            dia_laborables=data.get("dia_laborables"),
            fecha_inicio=parse_date(data.get("fecha_inicio")),
            hora_entrada=hora_entrada,
            hora_salida=hora_salida,
            descanso_minutos=data.get("descanso_minutos"),
            turno=data.get("turno"),
            inicio_vigencia=parse_date(data.get("inicio_vigencia")),
            fin_vigencia=parse_date(data.get("fin_vigencia")),
            creado_por=current_user.id
        )
        
        db.session.add(nuevo_horario)
        db.session.commit()

        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='horarios',
                operacion='INSERT',
                id_registro=nuevo_horario.id_horario,
                usuario=current_user.username,
                datos_nuevos=json.dumps({
                        'id_horario': nuevo_horario.id_horario,
                        'id_empleado': nuevo_horario.id_empleado,
                        'dia_laborables': nuevo_horario.dia_laborables,
                        'turno': nuevo_horario.turno,
                        'hora_entrada': str(nuevo_horario.hora_entrada) if nuevo_horario.hora_entrada else None,
                        'hora_salida': str(nuevo_horario.hora_salida) if nuevo_horario.hora_salida else None,
                        'descanso_minutos': nuevo_horario.descanso_minutos,
                        'inicio_vigencia': nuevo_horario.inicio_vigencia.isoformat() if nuevo_horario.inicio_vigencia else None,
                        'fin_vigencia': nuevo_horario.fin_vigencia.isoformat() if nuevo_horario.fin_vigencia else None
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
        
    except KeyError as e:
        db.session.rollback()
        return jsonify({"error": f"Campo requerido faltante: {str(e)}"}), 400
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Valor inválido en los datos: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        error_msg = str(e)
        if 'foreign key constraint' in error_msg.lower():
            return jsonify({"error": "El empleado especificado no existe"}), 400
        elif 'not null constraint' in error_msg.lower():
            return jsonify({"error": "Faltan campos obligatorios en el formulario"}), 400
        else:
            return jsonify({"error": "Error al crear el horario. Verifica los datos ingresados"}), 500

# READ - Listar todos 
@horario_bp.route("/", methods=["GET"])
@token_required
def listar_horarios(current_user):
    horarios = Horario.query.all()
    return jsonify([h.to_dict() for h in horarios])

# READ - Obtener uno 
@horario_bp.route("/<int:id_horario>", methods=["GET"])
@token_required
def obtener_horario(current_user, id_horario):
    horario = Horario.query.get_or_404(id_horario)
    return jsonify(horario.to_dict())

# UPDATE - Actualizar 
@horario_bp.route("/<int:id_horario>", methods=["PUT"])
@admin_required
def actualizar_horario(current_user, id_horario):
    horario = Horario.query.get_or_404(id_horario)
    data = request.get_json()

    hora_entrada_nueva = parse_time(data.get("hora_entrada", horario.hora_entrada))
    hora_salida_nueva = parse_time(data.get("hora_salida", horario.hora_salida))
    if hora_entrada_nueva is None or hora_salida_nueva is None:
        return jsonify({"error": "Formato de hora inválido. Use HH:MM"}), 400
    if hora_entrada_nueva == hora_salida_nueva:
        return jsonify({"error": "La hora de entrada y la hora de salida no pueden ser iguales"}), 400

    # Guardar datos anteriores para el log
    datos_anteriores = {
        'dia_laborables': horario.dia_laborables,
        'turno': horario.turno,
        'hora_entrada': str(horario.hora_entrada) if horario.hora_entrada else None,
        'hora_salida': str(horario.hora_salida) if horario.hora_salida else None
    }
    horario.dia_laborables = data.get("dia_laborables", horario.dia_laborables)
    horario.fecha_inicio = parse_date(data.get("fecha_inicio", horario.fecha_inicio))
    horario.hora_entrada = hora_entrada_nueva
    horario.hora_salida = hora_salida_nueva
    horario.descanso_minutos = data.get("descanso_minutos", horario.descanso_minutos)
    horario.turno = data.get("turno", horario.turno)
    horario.inicio_vigencia = parse_date(data.get("inicio_vigencia", horario.inicio_vigencia))
    horario.fin_vigencia = parse_date(data.get("fin_vigencia", horario.fin_vigencia))
    horario.modificado_por = current_user.id

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
            usuario=current_user.username,
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

# DELETE - Eliminar
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
            usuario=current_user.username,
            datos_anteriores=json.dumps(datos_anteriores)
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_error:
        print(f" Error al registrar log: {log_error}")
    
    return jsonify({"mensaje": "Horario eliminado exitosamente"})