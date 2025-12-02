import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from models.usuario import Usuario

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
            
            # Verificar que sea administrador (aceptar variantes 'administrador' o 'admin')
            if current_user.rol is None or current_user.rol.lower() not in ('administrador', 'admin'):
                return jsonify({'error': 'Acceso denegado. Se requiere rol de administrador'}), 403
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated
