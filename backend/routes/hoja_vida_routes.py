from flask import Blueprint, request, jsonify
from extensions import db
from models.hoja_vida import Hoja_Vida
from models.log_transaccional import LogTransaccional
from utils.auth import token_required, admin_required
from utils.parsers import parse_date
from utils.file_service import upload_file_to_vm, delete_file_from_vm # Funciones del server de archivos
import json

hoja_vida_bp = Blueprint('hoja_vida', __name__, url_prefix='/api/hojas-vida')

# CREATE - Crear
@hoja_vida_bp.route("/", methods=["POST"])
@admin_required
def crear_hoja_vida(current_user):
    try:
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        id_empleado = data.get('id_empleado')
        tipo = data.get('tipo')
        
        # Validaciones básicas de campos de texto
        if not id_empleado:
            return jsonify({"error": "El id_empleado es requerido"}), 400
        if not tipo:
            return jsonify({"error": "El tipo de documento es requerido"}), 400

        # 2. Manejo del archivo
        archivo_url = None
        if 'archivo' in request.files:
            file = request.files['archivo']
            if file.filename != '':
                archivo_url = upload_file_to_vm(file)
                if not archivo_url:
                    return jsonify({"error": "Error al procesar el archivo en el servidor de almacenamiento"}), 500

        # Si la URL del archivo viene en el JSON/form pero no como archivo
        if not archivo_url and 'ruta_archivo_url' in data:
            archivo_url = data.get('ruta_archivo_url')

        nueva_hoja_vida = Hoja_Vida(
            id_empleado=int(id_empleado),
            tipo=tipo,
            nombre_documento=data.get("nombre_documento"),
            institucion=data.get("institucion"),
            fecha_inicio=parse_date(data.get("fecha_inicio")),
            fecha_finalizacion=parse_date(data.get("fecha_finalizacion")),
            ruta_archivo_url=archivo_url,
            creado_por=current_user.id
        )
        
        db.session.add(nueva_hoja_vida)
        db.session.commit()

        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='hojas_vida',
                operacion='INSERT',
                id_registro=nueva_hoja_vida.id_hoja_vida,
                usuario=current_user.username,
                datos_nuevos=json.dumps(nueva_hoja_vida.to_dict())
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"Error al registrar log: {log_error}")
        
        return jsonify({
            "mensaje": "Hoja de Vida creada exitosamente",
            "hoja_vida": nueva_hoja_vida.to_dict()
        }), 201
        
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
            return jsonify({"error": "Error al crear la hoja de vida. Verifica los datos"}), 500

# READ - Listar todos
@hoja_vida_bp.route("/", methods=["GET"])
@token_required
def listar_hojas_vida(current_user):
    # Opcional: filtrar por empleado
    id_empleado_query = request.args.get('id_empleado')
    if id_empleado_query:
        registros = Hoja_Vida.query.filter_by(id_empleado=id_empleado_query).all()
    else:
        registros = Hoja_Vida.query.all()
    
    return jsonify([r.to_dict() for r in registros])

# READ - Obtener uno
@hoja_vida_bp.route("/<int:id_hoja_vida>", methods=["GET"])
@token_required
def obtener_hoja_vida(current_user, id_hoja_vida):
    registro = Hoja_Vida.query.get_or_404(id_hoja_vida)
    return jsonify(registro.to_dict())

# # UPDATE - Actualizar
@hoja_vida_bp.route("/<int:id_hoja_vida>", methods=["PUT"])
@admin_required
def actualizar_hoja_vida(current_user, id_hoja_vida):
    registro = Hoja_Vida.query.get_or_404(id_hoja_vida)
    
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    # Guardar datos anteriores para el log
    datos_anteriores = {
        'tipo': registro.tipo,
        'nombre_documento': registro.nombre_documento,
        'institucion': registro.institucion,
        'fecha_inicio': registro.fecha_inicio.isoformat() if registro.fecha_inicio else None,
        'fecha_finalizacion': registro.fecha_finalizacion.isoformat() if registro.fecha_finalizacion else None,
        'ruta_archivo_url': registro.ruta_archivo_url
    }
    
    # 1. Actualizar campos de texto
    registro.tipo = data.get("tipo", registro.tipo)
    registro.nombre_documento = data.get("nombre_documento", registro.nombre_documento)
    registro.institucion = data.get("institucion", registro.institucion)
    
    # Usar una lógica que no falle si la fecha viene como objeto o como string
    fecha_inicio_data = data.get("fecha_inicio", registro.fecha_inicio)
    if fecha_inicio_data:
        registro.fecha_inicio = parse_date(fecha_inicio_data)

    fecha_finalizacion_data = data.get("fecha_finalizacion", registro.fecha_finalizacion)
    if fecha_finalizacion_data:
        registro.fecha_finalizacion = parse_date(fecha_finalizacion_data)

    registro.modificado_por = current_user.id

    # 2. Lógica de Archivos (La parte nueva)
    # Si viene un archivo nuevo en la petición...
    if 'archivo' in request.files:
        file = request.files['archivo']
        if file.filename != '':
            # A. Si ya existía un archivo antes, lo borramos de la VM
            if registro.ruta_archivo_url:
                delete_file_from_vm(registro.ruta_archivo_url)
            
            # B. Subimos el nuevo archivo
            nueva_url = upload_file_to_vm(file)
            
            if nueva_url:
                registro.ruta_archivo_url = nueva_url
            else:
                return jsonify({"error": "Error al subir el nuevo archivo al servidor"}), 500

    db.session.commit()

    # REGISTRAR LOG
    try:
        datos_nuevos = {
            'tipo': registro.tipo,
            'nombre_documento': registro.nombre_documento,
            'institucion': registro.institucion,
            'fecha_inicio': registro.fecha_inicio.isoformat() if registro.fecha_inicio else None,
            'fecha_finalizacion': registro.fecha_finalizacion.isoformat() if registro.fecha_finalizacion else None,
            'ruta_archivo_url': registro.ruta_archivo_url
        }
        
        log = LogTransaccional(
            tabla_afectada='hojas_vida',
            operacion='UPDATE',
            id_registro=registro.id_hoja_vida,
            usuario=current_user.username,
            datos_anteriores=json.dumps(datos_anteriores),
            datos_nuevos=json.dumps(datos_nuevos)
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_error:
        print(f" Error al registrar log: {log_error}")
    
    return jsonify({
        "mensaje": "Registro de Hoja de Vida actualizado exitosamente",
        "hoja_vida": registro.to_dict()
    })

# DELETE - Eliminar
@hoja_vida_bp.route("/<int:id_hoja_vida>", methods=["DELETE"])
@admin_required
def eliminar_hoja_vida(current_user, id_hoja_vida):
    registro = Hoja_Vida.query.get_or_404(id_hoja_vida)

    # Guardar datos antes de eliminar para el log
    datos_anteriores = {
        'id_empleado': registro.id_empleado,
        'tipo': registro.tipo,
        'nombre_documento': registro.nombre_documento,
        'ruta_archivo_url': registro.ruta_archivo_url
    }
    hoja_vida_id = registro.id_hoja_vida
    
    # 1. Eliminar el archivo físico de la VM si existe
    if registro.ruta_archivo_url:
        delete_file_from_vm(registro.ruta_archivo_url)

    # 2. Eliminar el registro de la base de datos
    db.session.delete(registro)
    db.session.commit()

    # REGISTRAR LOG
    try:
        log = LogTransaccional(
            tabla_afectada='hojas_vida',
            operacion='DELETE',
            id_registro=hoja_vida_id,
            usuario=current_user.username,
            datos_anteriores=json.dumps(datos_anteriores)
        )
        db.session.add(log)
        db.session.commit()
    except Exception as log_error:
        print(f" Error al registrar log: {log_error}")
    
    return jsonify({"mensaje": "Registro de Hoja de Vida y archivo eliminados exitosamente"})