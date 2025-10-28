from flask import Blueprint, request, jsonify
from extensions import db
from models.cargo import Cargo
from models.log_transaccional import LogTransaccional
import json
from decimal import Decimal

cargo_bp = Blueprint('cargo', __name__, url_prefix='/api/cargos')

# CREATE - Crear un nuevo cargo
@cargo_bp.route('/', methods=['POST'])
def crear_cargo():
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        if not data.get('nombre'):
            return jsonify({"error": "El nombre del cargo es requerido"}), 400
        
        # Crear nuevo cargo
        nuevo_cargo = Cargo(
            nombre=data['nombre'],
            sueldo_base=data.get('sueldo_base', 0.0),
            creado_por=data.get('creado_por')
        )
        
        db.session.add(nuevo_cargo)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='cargos',  # CORREGIDO: ahora es plural
                operacion='INSERT',
                id_registro=nuevo_cargo.id,
                usuario=str(data.get('creado_por', 'sistema')),  # Convertir a string
                datos_nuevos=json.dumps({
                    'nombre': nuevo_cargo.nombre,
                    'sueldo_base': float(nuevo_cargo.sueldo_base) if nuevo_cargo.sueldo_base else 0.0
                })
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
            # No hacer rollback aquí, el cargo ya se creó exitosamente
        
        return jsonify({
            "mensaje": "Cargo creado exitosamente",
            "id": nuevo_cargo.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear cargo: {str(e)}"}), 500


# READ - Obtener todos los cargos
@cargo_bp.route('/', methods=['GET'])
def listar_cargos():
    try:
        cargos = Cargo.query.all()
        
        resultado = []
        for cargo in cargos:
            resultado.append({
                "id": cargo.id,
                "nombre": cargo.nombre,
                "sueldo_base": cargo.sueldo_base,
                "fecha_creacion": cargo.fecha_creacion.isoformat() if cargo.fecha_creacion else None
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({"error": f"Error al obtener cargos: {str(e)}"}), 500


# READ - Obtener un cargo por ID
@cargo_bp.route('/<int:id>', methods=['GET'])
def obtener_cargo(id):
    try:
        cargo = Cargo.query.get(id)
        
        if not cargo:
            return jsonify({"error": "Cargo no encontrado"}), 404
        
        return jsonify({
            "id": cargo.id,
            "nombre": cargo.nombre,
            "sueldo_base": cargo.sueldo_base,
            "fecha_creacion": cargo.fecha_creacion.isoformat() if cargo.fecha_creacion else None,
            "fecha_actualizacion": cargo.fecha_actualizacion.isoformat() if cargo.fecha_actualizacion else None,
            "creado_por": cargo.creado_por,
            "modificado_por": cargo.modificado_por
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error al obtener cargo: {str(e)}"}), 500


# UPDATE - Actualizar un cargo
@cargo_bp.route('/<int:id>', methods=['PUT'])
def actualizar_cargo(id):
    try:
        cargo = Cargo.query.get(id)
        
        if not cargo:
            return jsonify({"error": "Cargo no encontrado"}), 404
        
        data = request.get_json()
        
        # Guardar datos anteriores
        datos_anteriores = {
            'nombre': cargo.nombre,
            'sueldo_base': float(cargo.sueldo_base) if cargo.sueldo_base else 0.0
        }
        
        # Actualizar campos
        if 'nombre' in data:
            cargo.nombre = data['nombre']
        
        if 'sueldo_base' in data:
            cargo.sueldo_base = data['sueldo_base']
        
        if 'modificado_por' in data:
            cargo.modificado_por = data['modificado_por']
        
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            datos_nuevos = {
                'nombre': cargo.nombre,
                'sueldo_base': float(cargo.sueldo_base) if cargo.sueldo_base else 0.0
            }
            
            log = LogTransaccional(
                tabla_afectada='cargos',
                operacion='UPDATE',
                id_registro=cargo.id,
                usuario=str(data.get('modificado_por', 'sistema')),
                datos_anteriores=json.dumps(datos_anteriores),
                datos_nuevos=json.dumps(datos_nuevos)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({
            "mensaje": "Cargo actualizado exitosamente",
            "cargo": {
                "id": cargo.id,
                "nombre": cargo.nombre,
                "sueldo_base": cargo.sueldo_base
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar cargo: {str(e)}"}), 500


# DELETE - Eliminar un cargo
@cargo_bp.route('/<int:id>', methods=['DELETE'])
def eliminar_cargo(id):
    try:
        cargo = Cargo.query.get(id)
        
        if not cargo:
            return jsonify({"error": "Cargo no encontrado"}), 404
        
        # Verificar empleados
        if cargo.empleados:
            return jsonify({
                "error": "No se puede eliminar el cargo porque tiene empleados asociados"
            }), 400
        
        # Guardar datos antes de eliminar
        datos_anteriores = {
            'nombre': cargo.nombre,
            'sueldo_base': float(cargo.sueldo_base) if cargo.sueldo_base else 0.0
        }
        cargo_id = cargo.id
        
        db.session.delete(cargo)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='cargos',
                operacion='DELETE',
                id_registro=cargo_id,
                usuario='sistema',
                datos_anteriores=json.dumps(datos_anteriores)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f"⚠️ Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Cargo eliminado exitosamente"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar cargo: {str(e)}"}), 500