from flask import Blueprint, request, jsonify
from app import db
from models.hoja_vida import Hoja_Vida
from datetime import datetime, date

hoja_vida_bp = Blueprint('hoja_vida', __name__, url_prefix='/api/hojas-vida')

def parse_date(date_input):
    # 1. Si ya es un objeto 'date', simplemente devuélvelo.
    if isinstance(date_input, date):
        return date_input
    # 2. Si es None o un string vacío, devuelve None.
    if not date_input: 
        return None
    # 3. Si es un string, intenta procesarlo.
    try: 
        return datetime.strptime(date_input, '%Y-%m-%d').date()
    except (ValueError, TypeError): 
        return None # Falla si no es un string de fecha válido

hoja_vida_bp = Blueprint("hoja_vida", __name__, url_prefix="/api/hojas_vida")

# CREATE - Crear
@hoja_vida_bp.route("/", methods=["POST"])
def crear_hoja_vida():
    data = request.get_json()
    
    if "id_empleado" not in data:
        return jsonify({"error": "id_empleado es requerido"}), 400

    nueva_hoja_vida = Hoja_Vida(
        id_empleado=data["id_empleado"],
        tipo=data.get("tipo"),
        nombre_documento=data.get("nombre_documento"),
        institucion=data.get("institucion"),
        fecha_inicio=parse_date(data.get("fecha_inicio")),
        fecha_finalizacion=parse_date(data.get("fecha_finalizacion")),
        ruta_archivo_url=data.get("ruta_archivo_url"),
        creado_por=data.get("creado_por")
    )
    
    db.session.add(nueva_hoja_vida)
    db.session.commit()
    
    return jsonify({
        "mensaje": "Registro de Hoja de Vida creado exitosamente",
        "hoja_vida": nueva_hoja_vida.to_dict()
    }), 201

# READ - Listar todos
@hoja_vida_bp.route("/", methods=["GET"])
def listar_hojas_vida():
    # Opcional: filtrar por empleado
    id_empleado_query = request.args.get('id_empleado')
    if id_empleado_query:
        registros = Hoja_Vida.query.filter_by(id_empleado=id_empleado_query).all()
    else:
        registros = Hoja_Vida.query.all()
    
    return jsonify([r.to_dict() for r in registros])

# READ - Obtener uno
@hoja_vida_bp.route("/<int:id_hoja_vida>", methods=["GET"])
def obtener_hoja_vida(id_hoja_vida):
    registro = Hoja_Vida.query.get_or_404(id_hoja_vida)
    return jsonify(registro.to_dict())

# UPDATE - Actualizar
@hoja_vida_bp.route("/<int:id_hoja_vida>", methods=["PUT"])
def actualizar_hoja_vida(id_hoja_vida):
    registro = Hoja_Vida.query.get_or_404(id_hoja_vida)
    data = request.get_json()
    
    registro.tipo = data.get("tipo", registro.tipo)
    registro.nombre_documento = data.get("nombre_documento", registro.nombre_documento)
    registro.institucion = data.get("institucion", registro.institucion)
    registro.fecha_inicio = parse_date(data.get("fecha_inicio", registro.fecha_inicio))
    registro.fecha_finalizacion = parse_date(data.get("fecha_finalizacion", registro.fecha_finalizacion))
    registro.ruta_archivo_url = data.get("ruta_archivo_url", registro.ruta_archivo_url)
    registro.modificado_por = data.get("modificado_por")

    db.session.commit()
    
    return jsonify({
        "mensaje": "Registro de Hoja de Vida actualizado exitosamente",
        "hoja_vida": registro.to_dict()
    })

# DELETE - Eliminar
@hoja_vida_bp.route("/<int:id_hoja_vida>", methods=["DELETE"])
def eliminar_hoja_vida(id_hoja_vida):
    registro = Hoja_Vida.query.get_or_404(id_hoja_vida)
    
    db.session.delete(registro)
    db.session.commit()
    
    return jsonify({"mensaje": "Registro de Hoja de Vida eliminado exitosamente"})