from flask import Blueprint, request, jsonify
from extensions import db
from models.usuario import Usuario
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

usuario_bp = Blueprint('usuario', __name__, url_prefix='/api/usuarios')

# CREATE - Crear un nuevo usuario
@usuario_bp.route('/', methods=['POST'])
def crear_usuario():
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        if not data.get('username') or not data.get('password') or not data.get('rol'):
            return jsonify({"error": "username, password y rol son campos requeridos"}), 400
        
        # Verificar si el usuario ya existe
        usuario_existente = Usuario.query.filter_by(username=data['username']).first()
        if usuario_existente:
            return jsonify({"error": "El nombre de usuario ya existe"}), 400
        
        # Validar rol
        roles_validos = ['admin', 'supervisor', 'empleado']
        if data['rol'] not in roles_validos:
            return jsonify({"error": f"Rol inválido. Debe ser uno de: {', '.join(roles_validos)}"}), 400
        
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
def obtener_usuarios():
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
def obtener_usuario(id):
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
def actualizar_usuario(id):
    try:
        usuario = Usuario.query.get(id)
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json()
        
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
            roles_validos = ['admin', 'supervisor', 'empleado']
            if data['rol'] not in roles_validos:
                return jsonify({"error": f"Rol inválido. Debe ser uno de: {', '.join(roles_validos)}"}), 400
            usuario.rol = data['rol']
        
        # Actualizar fecha de modificación
        usuario.fecha_actualizacion = datetime.utcnow()
        
        db.session.commit()
        
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
def eliminar_usuario(id):
    try:
        usuario = Usuario.query.get(id)
        
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        db.session.delete(usuario)
        db.session.commit()
        
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
        
        return jsonify({
            "mensaje": "Login exitoso",
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
def obtener_usuarios_por_rol(rol):
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
