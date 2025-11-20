import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Usuarios.css';

const API_URL = process.env.REACT_APP_API_URL;

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState({
    id: null,
    username: '',
    password: '',
    rol: 'empleado',
    email: ''
  });

  useEffect(() => {
    cargarUsuarios();
    cargarCargos();
    cargarEmpleados();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/usuarios/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const cargarCargos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cargos/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCargos(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const cargarEmpleados = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/empleados/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setEmpleados(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const verificarTieneEmpleado = (idUsuario) => {
    return empleados.some(emp => emp.id_usuario === idUsuario);
  };

  const irACrearEmpleado = (usuario) => {
    // Guardar datos del usuario en sessionStorage para prellenar el formulario de empleado
    sessionStorage.setItem('usuarioParaEmpleado', JSON.stringify(usuario));
    window.location.href = '/empleados?crear=true';
  };

  const abrirModal = (usuario = null) => {
    if (usuario) {
      setUsuarioActual({
        ...usuario,
        password: '' // No mostrar la contraseña al editar
      });
      setModoEdicion(true);
    } else {
      setUsuarioActual({
        id: null,
        username: '',
        password: '',
        rol: 'empleado',
        email: ''
      });
      setModoEdicion(false);
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // En modo edición, solo enviar password si se ingresó uno nuevo
    const datosUsuario = { ...usuarioActual };
    if (modoEdicion && !datosUsuario.password) {
      delete datosUsuario.password;
    }
    
    try {
      const url = modoEdicion 
        ? `${API_URL}/api/usuarios/${usuarioActual.id}`
        : `${API_URL}/api/usuarios/`;
      
      const method = modoEdicion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosUsuario)
      });

      if (response.ok) {
        alert('Usuario guardado exitosamente');
        cargarUsuarios();
        cerrarModal();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar el usuario'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el usuario');
    }
  };

  const eliminarUsuario = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/usuarios/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          alert('Usuario eliminado exitosamente');
          cargarUsuarios();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error || 'No se pudo eliminar el usuario'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el usuario');
      }
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="usuarios-container">
        <div className="usuarios-header">
          <h2>Gestión de Usuarios</h2>
          <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Usuario</button>
        </div>

        <table className="usuarios-tabla">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(usuario => (
            <tr key={usuario.id}>
              <td>{usuario.username}</td>
              <td>{usuario.email}</td>
              <td>
                <span className={`rol ${usuario.rol}`}>{usuario.rol}</span>
              </td>
              <td>{usuario.fecha_creacion ? new Date(usuario.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
              <td>
                <button className="btn-editar" onClick={() => abrirModal(usuario)}>Editar</button>
                <button className="btn-eliminar" onClick={() => eliminarUsuario(usuario.id)}>Eliminar</button>
                {!verificarTieneEmpleado(usuario.id) && (
                  <button className="btn-guardar" onClick={() => irACrearEmpleado(usuario)} style={{marginLeft: '5px'}}>
                    Completar Datos Empleado
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarModal && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>{modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={guardarUsuario}>
              <div className="form-grupo">
                <label>Username:</label>
                <input
                  type="text"
                  value={usuarioActual.username}
                  onChange={(e) => setUsuarioActual({...usuarioActual, username: e.target.value})}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>Email:</label>
                <input
                  type="email"
                  value={usuarioActual.email}
                  onChange={(e) => setUsuarioActual({...usuarioActual, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-grupo">
                <label>Password {modoEdicion && '(dejar en blanco para mantener la actual)'}:</label>
                <input
                  type="password"
                  value={usuarioActual.password}
                  onChange={(e) => setUsuarioActual({...usuarioActual, password: e.target.value})}
                  required={!modoEdicion}
                />
              </div>

              <div className="form-grupo">
                <label>Cargo:</label>
                <select
                  value={usuarioActual.rol}
                  onChange={(e) => setUsuarioActual({...usuarioActual, rol: e.target.value})}
                  required
                >
                  <option value="">Seleccione un cargo</option>
                  {cargos.map(cargo => (
                    <option key={cargo.id_cargo} value={cargo.nombre_cargo}>
                      {cargo.nombre_cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-botones">
                <button type="submit" className="btn-guardar">Guardar</button>
                <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Usuarios;
