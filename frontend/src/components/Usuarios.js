import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import './Usuarios.css';
import { FaEdit, FaTrash, FaEye, FaFilePdf, FaFileExcel, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 5;
  const modalRef = useRef(null);
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

  // Paginación
  const usuariosFiltrados = obtenerUsuariosFiltradosYOrdenados();
  const totalPaginas = Math.ceil(usuariosFiltrados.length / registrosPorPagina);
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const indiceFin = indiceInicio + registrosPorPagina;
  const usuariosPaginados = usuariosFiltrados.slice(indiceInicio, indiceFin);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Usuarios', 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const datos = usuariosFiltrados.map(usuario => [
      usuario.username,
      usuario.rol,
      new Date(usuario.fecha_creacion).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [['Usuario', 'Rol', 'Fecha Creación']],
      body: datos,
      startY: 35,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255] }
    });

    doc.save(`usuarios_${new Date().getTime()}.pdf`);
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const datos = usuariosFiltrados.map(usuario => ({
      'Usuario': usuario.username,
      'Rol': usuario.rol,
      'Fecha Creación': new Date(usuario.fecha_creacion).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, `usuarios_${new Date().getTime()}.xlsx`);
  };

  // Cerrar modal al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        cerrarModal();
      }
    };

    if (mostrarModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarModal]);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="usuarios-container">
        <div className="usuarios-header">
          <h2>Gestión de Usuarios</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" onClick={exportarPDF} title="Exportar a PDF">
              <FaFilePdf /> PDF
            </button>
            <button className="btn-exportar btn-excel" onClick={exportarExcel} title="Exportar a Excel">
              <FaFileExcel /> Excel
            </button>
            {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') && (
              <button className="btn-nuevo" onClick={() => abrirModal()}>
                <FaPlus /> Nuevo Usuario
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="busqueda-seccion">
          <div className="busqueda-wrapper">
            <input
              type="text"
              placeholder="Buscar por username, rol o fecha..."
              value={busqueda}
              onChange={(e) => {setBusqueda(e.target.value); setPaginaActual(1);}}
              className="input-busqueda"
            />
          </div>
          <span className="resultados-info">
            Mostrando <strong>{usuariosPaginados.length}</strong> de <strong>{usuariosFiltrados.length}</strong> registros
          </span>
        </div>

        <div className="tabla-responsive">
          <table className="usuarios-tabla">
            <thead>
              <tr>
                <th onClick={() => ordenarPor('username')} className="th-sortable">
                  Username {ordenamiento.campo === 'username' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => ordenarPor('rol')} className="th-sortable">
                  Rol {ordenamiento.campo === 'rol' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => ordenarPor('fecha_creacion')} className="th-sortable">
                  Fecha Creación {ordenamiento.campo === 'fecha_creacion' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                </th>
                <th className="th-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-data">No hay usuarios que mostrar</td>
                </tr>
              ) : (
                usuariosPaginados.map(usuario => (
                  <tr key={usuario.id}>
                    <td>{usuario.username}</td>
                    <td>
                      <span className={`rol ${usuario.rol}`}>{usuario.rol}</span>
                    </td>
                    <td className="td-center">{usuario.fecha_creacion ? new Date(usuario.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
                    <td className="td-center">
                      <div className="acciones-grupo">
                        {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
                          <>
                            <button className="btn-icono editar" onClick={() => abrirModal(usuario)} title="Editar">
                              <FaEdit />
                            </button>
                            {(rolUsuario === 'admin' || rolUsuario === 'Administrador') && (
                              <button className="btn-icono eliminar" onClick={() => eliminarUsuario(usuario.id)} title="Eliminar">
                                <FaTrash />
                              </button>
                            )}
                            {verificarTieneEmpleado(usuario.id) && (
                              <button className="btn-icono ver" onClick={() => {
                                const empleado = empleados.find(emp => emp.id_usuario === usuario.id);
                                if (empleado) {
                                  sessionStorage.setItem('empleadoSeleccionado', JSON.stringify(empleado));
                                  window.location.href = '/empleados?ver=' + empleado.id;
                                }
                              }} title="Ver Empleado">
                                <FaEye />
                              </button>
                            )}
                          </>
                        ) : usuario.id === idUsuarioActual ? (
                          <button className="btn-icono editar" onClick={() => abrirModal(usuario)} title="Editar">
                            <FaEdit />
                          </button>
                        ) : (
                          <span style={{color: '#999'}}>-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
      </table>
      </div>

      {/* Paginación */}
      {usuariosFiltrados.length > 0 && (
        <div className="paginacion">
          <div className="paginacion-controles">
            <button 
              className="btn-paginacion" 
              onClick={() => cambiarPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>
            
            <div className="numeros-pagina">
              {[...Array(Math.ceil(usuariosFiltrados.length / registrosPorPagina))].map((_, index) => (
                <button
                  key={index + 1}
                  className={`btn-numero ${paginaActual === index + 1 ? 'activo' : ''}`}
                  onClick={() => cambiarPagina(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button 
              className="btn-paginacion" 
              onClick={() => cambiarPagina(paginaActual + 1)}
              disabled={paginaActual === Math.ceil(usuariosFiltrados.length / registrosPorPagina)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {mostrarModal && (
        <div className="modal">
          <div className="modal-contenido" ref={modalRef}>
            <div className="modal-header">
              <h3>{modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="btn-cerrar-modal" onClick={cerrarModal} type="button">
                <FaTimes />
              </button>
            </div>
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
