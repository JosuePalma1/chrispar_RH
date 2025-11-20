from flask import Blueprint, request, jsonify
from extensions import db
from models.usuario import Usuario
from models.log_transaccional import LogTransaccional
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
from utils.auth import generate_token, admin_required

usuario_bp = Blueprint('usuario', __name__, url_prefix='/api/usuarios')

# CREATE - Crear un nuevo usuario
@usuario_bp.route('/', methods=['POST'])
@admin_required
def crear_usuario(current_user):
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        if not data.get('username') or not data.get('password') or not data.get('rol'):
            return jsonify({"error": "username, password y rol son campos requeridos"}), 400
        
        # Verificar si el usuario ya existe
        usuario_existente = Usuario.query.filter_by(username=data['username']).first()
        if usuario_existente:
            return jsonify({"error": "El nombre de usuario ya existe"}), 400
        
        # Hash de la contraseña
        password_hash = generate_password_hash(data['password'])
        
        # Crear nuevo usuario
        nuevo_usuario = Usuario(
            username=data['username'],
            password=password_hash,
            rol=data['rol']
        )
        
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='usuarios',
                operacion='INSERT',
                id_registro=nuevo_usuario.id,
                usuario=data.get('username', 'sistema'),
                datos_nuevos=json.dumps({
                    'username': nuevo_usuario.username,
                    'rol': nuevo_usuario.rol
                    # NO incluir password por seguridad
                })
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({
            "mensaje": "Usuario creado exitosamente",
            "usuario": {
                "id": nuevo_usuario.id,
                "username": nuevo_usuario.username,
                "rol": nuevo_usuario.rol,
                "fecha_creacion": nuevo_usuario.fecha_creacion.isoformat() if nuevo_usuario.fecha_creacion else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al crear usuario: {str(e)}"}), 500


# READ - Obtener todos los usuarios
@usuario_bp.route('/', methods=['GET'])
@admin_required
def obtener_usuarios(current_user):
    try:
        usuarios = Usuario.query.all()
        
        resultado = []
        for usuario in usuarios:
            resultado.append({
                "id": usuario.id,
                "username": usuario.username,
                "rol": usuario.rol,
                "fecha_creacion": usuario.fecha_creacion.isoformat() if usuario.fecha_creacion else None,
                "fecha_actualizacion": usuario.fecha_actualizacion.isoformat() if usuario.fecha_actualizacion else None
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({"error": f"Error al obtener usuarios: {str(e)}"}), 500


# READ - Obtener un usuario por ID
@usuario_bp.route('/<int:id>', methods=['GET'])
@admin_required
def obtener_usuario(current_user, id):
    try:
        usuario = Usuario.query.get(id)
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        return jsonify({
            "id": usuario.id,
            "username": usuario.username,
            "rol": usuario.rol,
            "fecha_creacion": usuario.fecha_creacion.isoformat() if usuario.fecha_creacion else None,
            "fecha_actualizacion": usuario.fecha_actualizacion.isoformat() if usuario.fecha_actualizacion else None
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error al obtener usuario: {str(e)}"}), 500


# UPDATE - Actualizar un usuario
@usuario_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def actualizar_usuario(current_user, id):
    try:
        usuario = Usuario.query.get(id)
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json()
        
        # Guardar datos anteriores para el log
        datos_anteriores = {
            'username': usuario.username,
            'rol': usuario.rol
        }
        
        # Actualizar username si se proporciona
        if 'username' in data:
            # Verificar que el nuevo username no esté en uso
            if data['username'] != usuario.username:
                usuario_existente = Usuario.query.filter_by(username=data['username']).first()
                if usuario_existente:
                    return jsonify({"error": "El nombre de usuario ya existe"}), 400
            usuario.username = data['username']
        
        # Actualizar password si se proporciona
        if 'password' in data:
            usuario.password = generate_password_hash(data['password'])
        
        # Actualizar rol si se proporciona
        if 'rol' in data:
            usuario.rol = data['rol']
        
        # Actualizar fecha de modificación
        usuario.fecha_actualizacion = datetime.utcnow()
        
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            datos_nuevos = {
                'username': usuario.username,
                'rol': usuario.rol
            }
            
            log = LogTransaccional(
                tabla_afectada='usuarios',
                operacion='UPDATE',
                id_registro=usuario.id,
                usuario=data.get('usuario_modificador', usuario.username),
                datos_anteriores=json.dumps(datos_anteriores),
                datos_nuevos=json.dumps(datos_nuevos)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({
            "mensaje": "Usuario actualizado exitosamente",
            "usuario": {
                "id": usuario.id,
                "username": usuario.username,
                "rol": usuario.rol,
                "fecha_actualizacion": usuario.fecha_actualizacion.isoformat() if usuario.fecha_actualizacion else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar usuario: {str(e)}"}), 500


# DELETE - Eliminar un usuario
@usuario_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def eliminar_usuario(current_user, id):
    try:
        usuario = Usuario.query.get(id)
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Guardar datos antes de eliminar
        datos_anteriores = {
            'username': usuario.username,
            'rol': usuario.rol
        }
        usuario_id = usuario.id
        
        db.session.delete(usuario)
        db.session.commit()
        
        # REGISTRAR LOG
        try:
            log = LogTransaccional(
                tabla_afectada='usuarios',
                operacion='DELETE',
                id_registro=usuario_id,
                usuario='sistema',
                datos_anteriores=json.dumps(datos_anteriores)
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({"mensaje": "Usuario eliminado exitosamente"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al eliminar usuario: {str(e)}"}), 500


# LOGIN - Autenticar usuario
@usuario_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({"error": "Username y password son requeridos"}), 400
        
        usuario = Usuario.query.filter_by(username=data['username']).first()
        
        if not usuario:
            return jsonify({"error": "Credenciales inválidas"}), 401
        
        # Verificar contraseña
        if not check_password_hash(usuario.password, data['password']):
            return jsonify({"error": "Credenciales inválidas"}), 401
        
        # GENERAR TOKEN JWT
        token = generate_token(usuario.id, usuario.username, usuario.rol)
        
        # REGISTRAR LOG DE LOGIN
        try:
            log = LogTransaccional(
                tabla_afectada='usuarios',
                operacion='LOGIN',
                id_registro=usuario.id,
                usuario=usuario.username,
                datos_nuevos=json.dumps({
                    'evento': 'login_exitoso',
                    'timestamp': datetime.utcnow().isoformat()
                })
            )
            db.session.add(log)
            db.session.commit()
        except Exception as log_error:
            print(f" Error al registrar log: {log_error}")
        
        return jsonify({
            "mensaje": "Login exitoso",
            "token": token,
            "usuario": {
                "id": usuario.id,
                "username": usuario.username,
                "rol": usuario.rol
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error al autenticar: {str(e)}"}), 500


# Buscar usuarios por rol
@usuario_bp.route('/rol/<string:rol>', methods=['GET'])
@admin_required
def obtener_usuarios_por_rol(current_user, rol):
    try:
        usuarios = Usuario.query.filter_by(rol=rol).all()
        
        resultado = []
        for usuario in usuarios:
            resultado.append({
                "id": usuario.id,
                "username": usuario.username,
                "rol": usuario.rol,
                "fecha_creacion": usuario.fecha_creacion.isoformat() if usuario.fecha_creacion else None
            })
        
        return jsonify(resultado), 200
        
    except Exception as e:
        return jsonify({"error": f"Error al obtener usuarios: {str(e)}"}), 500