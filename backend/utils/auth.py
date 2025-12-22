import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from models.usuario import Usuario
from models.cargo import Cargo
import json

def generate_token(user_id, username, rol):
    """
    Genera un token JWT para el usuario autenticado.
    
    Args:
        user_id: ID del usuario
        username: Nombre de usuario
        rol: Rol del usuario (admin, empleado, etc.)
    
    Returns:
        str: Token JWT
    """
    payload = {
        'user_id': user_id,
        'username': username,
        'rol': rol,
        'exp': datetime.utcnow() + timedelta(hours=10),  # Expira en 10 segundos
        'iat': datetime.utcnow()  # Fecha de emisión
    }
    
    token = jwt.encode(
        payload,
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    return token


def token_required(f):
    """
    Decorador para proteger rutas que requieren autenticación.
    
    Uso:
        @token_required
        def mi_ruta_protegida(current_user):
            ...
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Obtener token del header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Formato de token inválido'}), 401
        
        if not token:
            return jsonify({'error': 'Token no proporcionado'}), 401
        
        try:
            # Decodificar token
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            # Obtener usuario actual
            current_user = Usuario.query.get(data['user_id'])
            
            if not current_user:
                return jsonify({'error': 'Usuario no encontrado'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        
        # Pasar current_user a la función decorada
        return f(current_user, *args, **kwargs)
    
    return decorated


def admin_required(f):
    """
    Decorador para rutas que solo pueden acceder administradores.
    
    Uso:
        @admin_required
        def ruta_solo_admin(current_user):
            ...
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Formato de token inválido'}), 401
        
        if not token:
            return jsonify({'error': 'Token no proporcionado'}), 401
        
        try:
            data = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            current_user = Usuario.query.get(data['user_id'])
            
            if not current_user:
                return jsonify({'error': 'Usuario no encontrado'}), 401
            
            # Verificar que sea administrador o supervisor (aceptar variantes)
            roles_permitidos = ('administrador', 'admin', 'supervisor')
            if current_user.rol is None or current_user.rol.lower() not in roles_permitidos:
                return jsonify({'error': 'Acceso denegado. Se requiere rol de administrador o supervisor'}), 403
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def module_permission_required(module_id: str):
    """Decorador para validar permisos por módulo.

    Requiere que la ruta ya esté protegida por @token_required o @admin_required,
    de modo que reciba `current_user` como primer argumento.
    
    - Admin/Administrador/Supervisor: acceso total
    - Otros: consulta Cargo.permisos (JSON) por nombre_cargo == current_user.rol
    """
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            try:
                if not module_id:
                    return jsonify({'error': 'Módulo inválido'}), 400

                rol = (current_user.rol or '').strip().lower()
                roles_permitidos = ('administrador', 'admin', 'supervisor')
                if rol in roles_permitidos:
                    return f(current_user, *args, **kwargs)

                cargo = Cargo.query.filter_by(nombre_cargo=current_user.rol).first()
                if not cargo or not cargo.permisos:
                    return jsonify({'error': 'Acceso denegado. Sin permisos asignados'}), 403

                try:
                    permisos = cargo.permisos
                    if isinstance(permisos, str):
                        permisos = json.loads(permisos or '[]')
                except Exception:
                    permisos = []

                if not isinstance(permisos, list) or module_id not in permisos:
                    return jsonify({'error': 'Acceso denegado. Sin permiso para este módulo'}), 403

                return f(current_user, *args, **kwargs)
            except Exception:
                return jsonify({'error': 'Error al validar permisos'}), 500

        return decorated
    return decorator
