import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const API_URL = process.env.REACT_APP_API_URL;

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Limpiar error al escribir
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  console.log('🔵 1. Iniciando login...');
  console.log('🔵 2. URL completa:', `${API_URL}/api/usuarios/login`);
  console.log('🔵 3. Usuario:', formData.username);
  console.log('🔵 3. Password:', formData.password);

  // Validación básica
  if (!formData.username || !formData.password) {
    setError('Por favor, completa todos los campos');
    setLoading(false);
    return;
  }

  try {
    console.log('🔵 4. Enviando petición al backend...');
    
    const response = await axios.post(`${API_URL}/api/usuarios/login`, {
      username: formData.username,
      password: formData.password
    });

    console.log('✅ 5. Respuesta recibida del backend:', response.data);

    // Guardar token en localStorage
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.usuario));

    console.log('✅ 6. Token guardado en localStorage');
    console.log('✅ 7. Navegando al dashboard...');
    
    navigate('/dashboard');

  } catch (err) {
    console.error('❌ ERROR COMPLETO:', err);
    console.error('❌ Respuesta del servidor:', err.response);
    console.error('❌ Datos de la respuesta:', err.response?.data);
    
    if (err.response) {
      setError(err.response.data.error || 'Error al iniciar sesión');
    } else if (err.request) {
      setError('No se pudo conectar con el servidor');
    } else {
      setError('Error al procesar la solicitud');
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Iniciar Sesión</h2>
        <p className="subtitle">Sistema de Recursos Humanos - Chrispar Market</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Ingresa tu usuario"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
