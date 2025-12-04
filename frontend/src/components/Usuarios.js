import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Usuarios.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [ordenamiento, setOrdenamiento] = useState({ campo: null, direccion: 'asc' });
  const [rolUsuario, setRolUsuario] = useState('');
  const [idUsuarioActual, setIdUsuarioActual] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState({
    id: null,
    username: '',
    password: '',
    rol: 'empleado'
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRolUsuario(payload.rol || '');
        setIdUsuarioActual(payload.user_id);
      } catch (e) {
        console.error('Error al decodificar token:', e);
      }
    }
    cargarUsuarios();
    cargarEmpleados();
    cargarCargos();
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
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'No se pudo cargar usuarios'}));
        setError(errorBody.error || 'No se pudo cargar usuarios');
        setUsuarios([]);
        return;
      }

      const data = await response.json();
      setUsuarios(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error('Error:', error);
      setUsuarios([]);
      setError('No se pudo cargar usuarios');
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
      setEmpleados(Array.isArray(data) ? data : []);
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
      setCargos(Array.isArray(data) ? data : []);
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
        id: usuario.id,
        username: usuario.username,
        password: '', // No mostrar la contraseña al editar
        rol: usuario.rol
      });
      setModoEdicion(true);
    } else {
      setUsuarioActual({
        id: null,
        username: '',
        password: '',
        rol: 'empleado'
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
    const payload = {
      username: datosUsuario.username,
      rol: datosUsuario.rol
    };

    if (!modoEdicion || datosUsuario.password) {
      payload.password = datosUsuario.password;
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
        body: JSON.stringify(payload)
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

  const ordenarPor = (campo) => {
    const direccion = ordenamiento.campo === campo && ordenamiento.direccion === 'asc' ? 'desc' : 'asc';
    setOrdenamiento({ campo, direccion });
  };

  const filtrarUsuarios = () => {
    return usuarios.filter(usuario => {
      const busquedaLower = busqueda.toLowerCase();
      const fechaCreacion = new Date(usuario.fecha_creacion).toLocaleDateString();
      
      return (
        usuario.username.toLowerCase().includes(busquedaLower) ||
        usuario.rol.toLowerCase().includes(busquedaLower) ||
        fechaCreacion.includes(busquedaLower)
      );
    });
  };

  const obtenerUsuariosFiltradosYOrdenados = () => {
    if (!Array.isArray(usuarios)) return [];
    let resultado = filtrarUsuarios();

    // Filtrar visualmente si no es admin o supervisor
    const esAdminOSupervisor = rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor';
    if (!esAdminOSupervisor) {
      resultado = resultado.filter(u => u.id === idUsuarioActual);
    }

    if (ordenamiento.campo) {
      resultado.sort((a, b) => {
        let valorA = a[ordenamiento.campo];
        let valorB = b[ordenamiento.campo];

        if (ordenamiento.campo === 'fecha_creacion') {
          valorA = new Date(valorA);
          valorB = new Date(valorB);
        } else if (typeof valorA === 'string') {
          valorA = valorA.toLowerCase();
          valorB = valorB.toLowerCase();
        }

        if (valorA < valorB) return ordenamiento.direccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenamiento.direccion === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="usuarios-container">
        <div className="usuarios-header">
          <h2>Gestión de Usuarios</h2>
          {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') && (
            <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Usuario</button>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div style={{marginBottom: '15px'}}>
          <input
            type="text"
            placeholder="Buscar por username, rol o fecha..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{padding: '8px 12px', width: '300px', borderRadius: '4px', border: '1px solid #ddd'}}
          />
        </div>

        <table className="usuarios-tabla">
        <thead>
          <tr>
            <th onClick={() => ordenarPor('username')} style={{cursor: 'pointer'}}>
              Username {ordenamiento.campo === 'username' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => ordenarPor('rol')} style={{cursor: 'pointer'}}>
              Rol {ordenamiento.campo === 'rol' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => ordenarPor('fecha_creacion')} style={{cursor: 'pointer'}}>
              Fecha Creación {ordenamiento.campo === 'fecha_creacion' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {obtenerUsuariosFiltradosYOrdenados().map(usuario => (
            <tr key={usuario.id}>
              <td>{usuario.username}</td>
              <td>
                <span className={`rol ${usuario.rol}`}>{usuario.rol}</span>
              </td>
              <td>{usuario.fecha_creacion ? new Date(usuario.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
              <td>
                {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
                  <>
                    <button className="btn-editar" onClick={() => abrirModal(usuario)}>Editar</button>
                    {(rolUsuario === 'admin' || rolUsuario === 'Administrador') && (
                      <button className="btn-eliminar" onClick={() => eliminarUsuario(usuario.id)}>Eliminar</button>
                    )}
                  </>
                ) : usuario.id === idUsuarioActual ? (
                  <button className="btn-editar" onClick={() => abrirModal(usuario)}>Editar</button>
                ) : (
                  <span style={{color: '#999', fontSize: '14px'}}>-</span>
                )}
                {!verificarTieneEmpleado(usuario.id) ? (
                  <button className="btn-guardar" onClick={() => irACrearEmpleado(usuario)} style={{marginLeft: '5px'}}>
                    Completar Datos Empleado
                  </button>
                ) : (
                  <button className="btn-editar" onClick={() => {
                    const empleado = empleados.find(emp => emp.id_usuario === usuario.id);
                    if (empleado) {
                      sessionStorage.setItem('empleadoSeleccionado', JSON.stringify(empleado));
                      window.location.href = '/empleados?ver=' + empleado.id;
                    }
                  }} style={{marginLeft: '5px', backgroundColor: '#2196F3'}}>
                    Ver Empleado
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
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\s/g, ''); // Eliminar espacios
                    setUsuarioActual({...usuarioActual, username: valor});
                  }}
                  pattern="[^\s]+"
                  title="El username no puede contener espacios"
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
                <label>Rol (Cargo):</label>
                <select
                  value={usuarioActual.rol}
                  onChange={(e) => setUsuarioActual({...usuarioActual, rol: e.target.value})}
                  required
                >
                  <option value="">Seleccione un cargo</option>
                  {cargos.map((cargo) => (
                    <option key={cargo.id} value={cargo.nombre_cargo}>
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
