from flask import Blueprint, request, jsonify
from extensions import db
from models.empleado import Empleado

empleado_bp = Blueprint("empleado", __name__, url_prefix="/api/empleados")

@empleado_bp.route("/", methods=["POST"])
def crear_empleado():
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
        modalidad_decimos=data.get("modalidad_decimos")
    )
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({"mensaje":"Empleado creado", "id": nuevo.id}), 201

@empleado_bp.route("/", methods=["GET"])
def listar_empleados():
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
    return jsonify(result)

@empleado_bp.route("/<int:id>", methods=["GET"])
def obtener_empleado(id):
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
        "usuario_id": e.id_usuario
    })

@empleado_bp.route("/<int:id>", methods=["PUT"])
def actualizar_empleado(id):
    data = request.get_json()
    e = Empleado.query.get_or_404(id)
    e.nombres = data.get("nombres", e.nombres)
    e.apellidos = data.get("apellidos", e.apellidos)
    e.estado = data.get("estado", e.estado)
    e.cedula = data.get("cedula", e.cedula)
    e.id_cargo = data.get("id_cargo", e.id_cargo)
    db.session.commit()
    return jsonify({"mensaje":"Empleado actualizado"})

@empleado_bp.route("/<int:id>", methods=["DELETE"])
def eliminar_empleado(id):
    e = Empleado.query.get_or_404(id)
    db.session.delete(e)
    db.session.commit()
    return jsonify({"mensaje":"Empleado eliminado"})
