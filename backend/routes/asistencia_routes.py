from flask import Blueprint, request, jsonify
from extensions import db
from models.asistencia import Asistencia
from models.log_transaccional import LogTransaccional
from models.usuario import Usuario
from utils.auth import token_required, admin_required
from utils.parsers import parse_date, parse_time
import json
from datetime import datetime, time as dt_time, timedelta

asistencia_bp = Blueprint("asistencia", __name__, url_prefix="/api/asistencias")

@asistencia_bp.route("/", methods=["POST"])
@admin_required
def crear_asistencia(current_user):
    try:
        data = request.get_json()
        
        fecha = parse_date(data.get("fecha"))
        hora_entrada = parse_time(data.get("hora_entrada"))
        hora_salida = parse_time(data.get("hora_salida"))

        if not fecha or not hora_entrada:
            return jsonify({"error": "fecha y hora_entrada válidas son requeridas"}), 400

        # Calcular horas extra según horario: Lunes-Sábado 08:00 - 20:00
        def calcular_horas_extra(fecha_dt, entrada, salida):
            if entrada is None or salida is None:
                return 0.0
            try:
                dt_entrada = datetime.combine(fecha_dt, entrada)
                dt_salida = datetime.combine(fecha_dt, salida)
                # Si la salida es menor o igual a la entrada, asumimos que la salida fue al día siguiente
                if dt_salida <= dt_entrada:
                    dt_salida = dt_salida + timedelta(days=1)

                total_seg = (dt_salida - dt_entrada).total_seconds()

                # Si es domingo (weekday() == 6) todo es hora extra (considerando posible cruce de día)
                if fecha_dt.weekday() == 6:
                    return round(total_seg / 3600.0, 2)

                # Ventana normal: 08:00 - 20:00 para el día de la entrada
                ventana_inicio = datetime.combine(fecha_dt, dt_time(hour=8, minute=0, second=0))
                ventana_fin = datetime.combine(fecha_dt, dt_time(hour=20, minute=0, second=0))

                # Calcular solapamiento entre [entrada, salida] y [ventana_inicio, ventana_fin]
                inicio_solap = max(dt_entrada, ventana_inicio)
                fin_solap = min(dt_salida, ventana_fin)
                solap_seg = 0
                if fin_solap > inicio_solap:
                    solap_seg = (fin_solap - inicio_solap).total_seconds()

                extra_seg = total_seg - solap_seg
                return round(max(0.0, extra_seg) / 3600.0, 2)
            except Exception:
                return 0.0

        # Verificar duplicados: mismo empleado, misma fecha y misma hora_entrada
        try:
            existe = Asistencia.query.filter_by(id_empleado=data["id_empleado"], fecha=fecha, hora_entrada=hora_entrada).first()
            if existe:
                return jsonify({"error": "Ya existe una asistencia para este empleado en la misma fecha y hora de entrada"}), 400
        except Exception:
            # en caso de error en la consulta seguimos (no bloquear por validación de duplicado)
            existe = None

        horas_extra = calcular_horas_extra(fecha, hora_entrada, hora_salida)

        nueva = Asistencia(
            id_empleado=data["id_empleado"],
            fecha=fecha,
            hora_entrada=hora_entrada,
            hora_salida=hora_salida,
            horas_extra=horas_extra,
            creado_por=current_user.id
        )
        
        db.session.add(nueva)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='asistencias',
                operacion='INSERT',
                id_registro=nueva.id_asistencia,
                usuario=current_user.username,
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
        elif 'unique constraint' in error_msg.lower():
            return jsonify({"error": "Ya existe un registro de asistencia para este empleado en esta fecha"}), 400
        else:
            return jsonify({"error": "Error al crear la asistencia. Verifica los datos ingresados"}), 500


@asistencia_bp.route("/", methods=["GET"])
@token_required
def listar_asistencias(current_user):
    try:
        # Filtrar por id_empleado si se proporciona
        id_empleado = request.args.get("id_empleado")
        
        if id_empleado:
            asistencias = Asistencia.query.filter_by(id_empleado=int(id_empleado)).all()
        else:
            asistencias = Asistencia.query.all()
        
        result = []
        for a in asistencias:
            creado_usuario = None
            mod_usuario = None
            try:
                if a.creado_por:
                    u = Usuario.query.get(a.creado_por)
                    creado_usuario = u.username if u else None
                if a.modificado_por:
                    m = Usuario.query.get(a.modificado_por)
                    mod_usuario = m.username if m else None
            except Exception:
                creado_usuario = None
                mod_usuario = None

            result.append({
                "id_asistencia": a.id_asistencia,
                "id_empleado": a.id_empleado,
                "fecha": a.fecha.isoformat(),
                "hora_entrada": str(a.hora_entrada),
                "hora_salida": str(a.hora_salida) if a.hora_salida else None,
                "horas_extra": a.horas_extra,
                "creado_por": a.creado_por,
                "creado_por_username": creado_usuario,
                "modificado_por": a.modificado_por,
                "modificado_por_username": mod_usuario,
                "fecha_creacion": a.fecha_creacion.isoformat() if a.fecha_creacion else None,
                "fecha_actualizacion": a.fecha_actualizacion.isoformat() if a.fecha_actualizacion else None
            })
        return jsonify(result), 200
    except Exception as error:
        return jsonify({"error": f"Error al listar asistencias: {str(error)}"}), 500


@asistencia_bp.route("/<int:id>", methods=["GET"])
@token_required
def obtener_asistencia(current_user, id):
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
@admin_required
def actualizar_asistencia(current_user, id):
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
        hora_entrada = parse_time(data.get("hora_entrada", a.hora_entrada))
        hora_salida = parse_time(data.get("hora_salida", a.hora_salida))

        # Validar duplicado si se cambia la hora_entrada: mismo empleado, misma fecha y misma hora_entrada
        try:
            if hora_entrada is not None and (hora_entrada != a.hora_entrada):
                dup = Asistencia.query.filter(Asistencia.id_empleado == a.id_empleado,
                                              Asistencia.fecha == a.fecha,
                                              Asistencia.hora_entrada == hora_entrada,
                                              Asistencia.id_asistencia != a.id_asistencia).first()
                if dup:
                    return jsonify({"error": "Otra asistencia ya existe para este empleado en la misma fecha y hora de entrada"}), 400
        except Exception:
            pass

        a.hora_entrada = hora_entrada if hora_entrada is not None else a.hora_entrada
        a.hora_salida = hora_salida if hora_salida is not None else a.hora_salida

        # Recalcular horas extra si hay entrada/salida
        try:
            def calcular_horas_extra(fecha_dt, entrada, salida):
                if entrada is None or salida is None:
                    return 0.0
                try:
                    dt_entrada = datetime.combine(fecha_dt, entrada)
                    dt_salida = datetime.combine(fecha_dt, salida)
                    # Si la salida es menor o igual que la entrada, asumimos salida al día siguiente
                    if dt_salida <= dt_entrada:
                        dt_salida = dt_salida + timedelta(days=1)

                    total_seg = (dt_salida - dt_entrada).total_seconds()
                    if fecha_dt.weekday() == 6:
                        return round(total_seg / 3600.0, 2)
                    ventana_inicio = datetime.combine(fecha_dt, dt_time(hour=8, minute=0, second=0))
                    ventana_fin = datetime.combine(fecha_dt, dt_time(hour=20, minute=0, second=0))
                    inicio_solap = max(dt_entrada, ventana_inicio)
                    fin_solap = min(dt_salida, ventana_fin)
                    solap_seg = 0
                    if fin_solap > inicio_solap:
                        solap_seg = (fin_solap - inicio_solap).total_seconds()
                    extra_seg = total_seg - solap_seg
                    return round(max(0.0, extra_seg) / 3600.0, 2)
                except Exception:
                    return 0.0

            a.horas_extra = calcular_horas_extra(a.fecha, a.hora_entrada, a.hora_salida)
        except Exception:
            a.horas_extra = a.horas_extra

        a.modificado_por = current_user.id
        
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
                usuario=current_user.username,
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
@admin_required
def eliminar_asistencia(current_user, id):
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
                usuario=current_user.username,
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
