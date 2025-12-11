import React, { useState, useEffect, useRef } from 'react';
import { FaEdit, FaTrash, FaEye, FaFilePdf, FaFileExcel, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Sidebar from './Sidebar';
import './Empleados.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [ordenamiento, setOrdenamiento] = useState({ campo: null, direccion: 'asc' });
  const [rolUsuario, setRolUsuario] = useState('');
  const [idUsuarioActual, setIdUsuarioActual] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioPendiente, setUsuarioPendiente] = useState(null);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 5;
  const modalRef = useRef(null);
  const [empleadoActual, setEmpleadoActual] = useState({
    id: null,
    id_usuario: '',
    cargo_id: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    cedula: '',
    estado: 'activo',
    fecha_ingreso: '',
    fecha_egreso: '',
    tipo_cuenta_bancaria: '',
    numero_cuenta_bancaria: '',
    modalidad_fondo_reserva: 'Mensual',
    modalidad_decimos: 'Mensual'
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
    cargarEmpleados();
    cargarCargos();
    cargarUsuarios();
    
    // Verificar si viene desde Usuarios para completar datos
    const params = new URLSearchParams(window.location.search);
    if (params.get('crear') === 'true') {
      const usuarioData = sessionStorage.getItem('usuarioParaEmpleado');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioPendiente(usuario);
        sessionStorage.removeItem('usuarioParaEmpleado');
      }
    }
    
    // Si viene con parámetro ver, abrir modal del empleado
    if (params.get('ver')) {
      const empleadoData = sessionStorage.getItem('empleadoSeleccionado');
      if (empleadoData) {
        const empleado = JSON.parse(empleadoData);
        setTimeout(() => abrirModal(empleado), 500); // Esperar a que carguen los datos
        sessionStorage.removeItem('empleadoSeleccionado');
      }
    }
  }, []);

  // Abrir modal cuando los cargos estén cargados y haya un usuario pendiente
  useEffect(() => {
    if (usuarioPendiente && cargos.length > 0) {
      abrirModalConUsuario(usuarioPendiente);
      setUsuarioPendiente(null);
    }
  }, [usuarioPendiente, cargos]);

  const cargarEmpleados = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/empleados/`, {
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
      setEmpleados(data);
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

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/usuarios/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const abrirModal = (empleado = null) => {
    if (empleado) {
      // Convertir fechas de YYYY-MM-DD a formato input date
      const formatearFecha = (fecha) => {
        if (!fecha) return '';
        // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
        if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return fecha;
        // Si no, intentar convertir
        try {
          const date = new Date(fecha);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };
      
      setEmpleadoActual({
        id: empleado.id,
        id_usuario: empleado.id_usuario || '',
        cargo_id: empleado.cargo_id || empleado.id_cargo || '',
        nombres: empleado.nombres || '',
        apellidos: empleado.apellidos || '',
        fecha_nacimiento: formatearFecha(empleado.fecha_nacimiento),
        cedula: empleado.cedula || '',
        estado: empleado.estado || 'activo',
        fecha_ingreso: formatearFecha(empleado.fecha_ingreso),
        fecha_egreso: formatearFecha(empleado.fecha_egreso),
        tipo_cuenta_bancaria: empleado.tipo_cuenta_bancaria || '',
        numero_cuenta_bancaria: empleado.numero_cuenta_bancaria || '',
        modalidad_fondo_reserva: empleado.modalidad_fondo_reserva || 'Mensual',
        modalidad_decimos: empleado.modalidad_decimos || 'Mensual'
      });
      setModoEdicion(true);
    } else {
      setEmpleadoActual({
        id: null,
        id_usuario: '',
        cargo_id: '',
        nombres: '',
        apellidos: '',
        fecha_nacimiento: '',
        cedula: '',
        estado: 'activo',
        fecha_ingreso: '',
        fecha_egreso: '',
        tipo_cuenta_bancaria: '',
        numero_cuenta_bancaria: '',
        modalidad_fondo_reserva: 'Mensual',
        modalidad_decimos: 'Mensual'
      });
      setModoEdicion(false);
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const abrirModalConUsuario = (usuario) => {
    // Buscar el cargo que corresponde al rol del usuario
    const cargoCorrespondiente = cargos.find(c => c.nombre_cargo === usuario.rol);
    const cargoId = cargoCorrespondiente?.id ? cargoCorrespondiente.id.toString() : '';
    
    setEmpleadoActual({
      id: null,
      id_usuario: usuario.id.toString(),
      cargo_id: cargoId,
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      cedula: '',
      estado: 'activo',
      fecha_ingreso: '',
      fecha_egreso: '',
      tipo_cuenta_bancaria: '',
      numero_cuenta_bancaria: '',
      modalidad_fondo_reserva: 'Mensual',
      modalidad_decimos: 'Mensual'
    });
    setModoEdicion(false);
    setMostrarModal(true);
  };

  const manejarCambioUsuario = (idUsuario) => {
    // Si se deselecciona el usuario (valor vacío), solo actualizar id_usuario
    if (!idUsuario) {
      setEmpleadoActual({...empleadoActual, id_usuario: ''});
      return;
    }
    
    const usuarioSeleccionado = usuarios.find(u => u.id === parseInt(idUsuario));
    
    if (usuarioSeleccionado && usuarioSeleccionado.rol) {
      // Buscar el cargo que coincide con el rol del usuario
      const cargoCorrespondiente = cargos.find(c => c.nombre_cargo === usuarioSeleccionado.rol);
      
      // El backend puede devolver 'id' o 'id_cargo' dependiendo del endpoint
      const idCargo = cargoCorrespondiente?.id_cargo || cargoCorrespondiente?.id;
      
      if (cargoCorrespondiente && idCargo) {
        setEmpleadoActual({
          ...empleadoActual,
          id_usuario: idUsuario,
          cargo_id: idCargo.toString()
        });
      } else {
        // Usuario sin cargo correspondiente, mantener el cargo actual
        alert(`El usuario tiene el rol "${usuarioSeleccionado.rol}" pero no existe un cargo con ese nombre. Por favor, selecciona el cargo manualmente.`);
        setEmpleadoActual({...empleadoActual, id_usuario: idUsuario});
      }
    } else {
      // Usuario sin rol definido, mantener el cargo actual
      alert('El usuario no tiene un rol asignado. Por favor, selecciona el cargo manualmente.');
      setEmpleadoActual({...empleadoActual, id_usuario: idUsuario});
    }
  };

  const manejarCambioCargo = async (idCargo) => {
    setEmpleadoActual({...empleadoActual, cargo_id: idCargo});
    
    // Si hay un usuario asignado, actualizar su rol
    if (empleadoActual.id_usuario && idCargo) {
      // Buscar por 'id' no por 'id_cargo'
      const cargoSeleccionado = cargos.find(c => c.id === parseInt(idCargo));
      
      if (cargoSeleccionado) {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${API_URL}/api/usuarios/${empleadoActual.id_usuario}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rol: cargoSeleccionado.nombre_cargo
            })
          });
          // Recargar usuarios para reflejar el cambio
          cargarUsuarios();
        } catch (error) {
          console.error('Error al actualizar rol del usuario:', error);
        }
      }
    }
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    
    // Validar que cargo_id tenga valor
    if (!empleadoActual.cargo_id) {
      alert('Debe seleccionar un cargo');
      return;
    }
    
    // Validar que el usuario no esté asignado a otro empleado
    if (empleadoActual.id_usuario) {
      const usuarioYaAsignado = empleados.find(
        emp => emp.id_usuario === parseInt(empleadoActual.id_usuario) && emp.id !== empleadoActual.id
      );
      if (usuarioYaAsignado) {
        alert('Este usuario ya está asignado a otro empleado');
        return;
      }
    }
    
    // Validar fecha de ingreso no sea anterior a fecha de nacimiento
    if (empleadoActual.fecha_nacimiento && empleadoActual.fecha_ingreso) {
      if (new Date(empleadoActual.fecha_ingreso) < new Date(empleadoActual.fecha_nacimiento)) {
        alert('La fecha de ingreso no puede ser anterior a la fecha de nacimiento');
        return;
      }
    }
    
    // Validar cédula
    if (empleadoActual.cedula.length !== 10) {
      alert('La cédula debe tener exactamente 10 dígitos');
      return;
    }
    
    // Validar número de cuenta si se ingresó
    if (empleadoActual.numero_cuenta_bancaria && empleadoActual.numero_cuenta_bancaria.length !== 10) {
      alert('El número de cuenta debe tener exactamente 10 dígitos');
      return;
    }
    
    const token = localStorage.getItem('token');
    
    const datosEmpleado = {
      ...empleadoActual,
      id_usuario: empleadoActual.id_usuario ? parseInt(empleadoActual.id_usuario) : null,
      id_cargo: parseInt(empleadoActual.cargo_id), // Backend espera id_cargo
      fecha_ingreso: empleadoActual.fecha_ingreso || new Date().toISOString().split('T')[0], // Asegurar fecha por defecto
      fecha_egreso: empleadoActual.fecha_egreso || null
    };
    
    // Eliminar cargo_id ya que el backend no lo reconoce
    delete datosEmpleado.cargo_id;
    
    try {
      const url = modoEdicion 
        ? `${API_URL}/api/empleados/${empleadoActual.id}`
        : `${API_URL}/api/empleados/`;
      
      const method = modoEdicion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosEmpleado)
      });

      if (response.ok) {
        alert('Empleado guardado exitosamente');
        cargarEmpleados();
        cerrarModal();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar el empleado'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el empleado');
    }
  };

  const eliminarEmpleado = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este empleado?')) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/empleados/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          alert('Empleado eliminado exitosamente');
          cargarEmpleados();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error || 'No se pudo eliminar el empleado'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el empleado');
      }
    }
  };

  const getNombreCargo = (cargo_id) => {
    const cargo = cargos.find(c => c.id === cargo_id);
    return cargo ? cargo.nombre_cargo : 'N/A';
  };

  const ordenarPor = (campo) => {
    const direccion = ordenamiento.campo === campo && ordenamiento.direccion === 'asc' ? 'desc' : 'asc';
    setOrdenamiento({ campo, direccion });
  };

  const filtrarEmpleados = () => {
    if (!Array.isArray(empleados)) return [];
    return empleados.filter(empleado => {
      const busquedaLower = busqueda.toLowerCase();
      const usuario = Array.isArray(usuarios) ? usuarios.find(u => u.id === empleado.id_usuario) : null;
      const nombreUsuario = usuario?.username || '';
      const nombreCargo = getNombreCargo(empleado.cargo_id);
      
      return (
        (empleado.cedula || '').includes(busquedaLower) ||
        (empleado.nombres || '').toLowerCase().includes(busquedaLower) ||
        (empleado.apellidos || '').toLowerCase().includes(busquedaLower) ||
        nombreUsuario.toLowerCase().includes(busquedaLower) ||
        nombreCargo.toLowerCase().includes(busquedaLower) ||
        (empleado.fecha_ingreso || '').includes(busquedaLower)
      );
    });
  };

  const obtenerEmpleadosFiltradosYOrdenados = () => {
    let resultado = filtrarEmpleados();

    // Filtrar visualmente si no es admin o supervisor
    const esAdminOSupervisor = rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor';
    if (!esAdminOSupervisor) {
      resultado = resultado.filter(emp => emp.id_usuario === idUsuarioActual);
    }

    if (ordenamiento.campo) {
      resultado.sort((a, b) => {
        let valorA, valorB;

        if (ordenamiento.campo === 'usuario') {
          const usuarioA = usuarios.find(u => u.id === a.id_usuario);
          const usuarioB = usuarios.find(u => u.id === b.id_usuario);
          valorA = (usuarioA?.username || '').toLowerCase();
          valorB = (usuarioB?.username || '').toLowerCase();
        } else if (ordenamiento.campo === 'cargo') {
          valorA = getNombreCargo(a.cargo_id).toLowerCase();
          valorB = getNombreCargo(b.cargo_id).toLowerCase();
        } else if (ordenamiento.campo === 'fecha_ingreso') {
          valorA = new Date(a.fecha_ingreso || '1900-01-01');
          valorB = new Date(b.fecha_ingreso || '1900-01-01');
        } else {
          valorA = (a[ordenamiento.campo] || '').toString().toLowerCase();
          valorB = (b[ordenamiento.campo] || '').toString().toLowerCase();
        }

        if (valorA < valorB) return ordenamiento.direccion === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordenamiento.direccion === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  };

  // Paginación
  const empleadosFiltrados = obtenerEmpleadosFiltradosYOrdenados();
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const indiceFin = indiceInicio + registrosPorPagina;
  const empleadosPaginados = empleadosFiltrados.slice(indiceInicio, indiceFin);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text('Listado de Empleados', 14, 15);
    
    const datos = empleadosFiltrados.map(empleado => [
      empleado.cedula,
      `${empleado.nombres} ${empleado.apellidos}`,
      getNombreCargo(empleado.cargo_id),
      empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso).toLocaleDateString() : 'N/A',
      empleado.estado
    ]);

    autoTable(doc, {
      head: [['Cédula', 'Nombre Completo', 'Cargo', 'Fecha Ingreso', 'Estado']],
      body: datos,
      startY: 20
    });

    doc.save(`empleados_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const datos = empleadosFiltrados.map(empleado => ({
      'Cédula': empleado.cedula,
      'Nombres': empleado.nombres,
      'Apellidos': empleado.apellidos,
      'Cargo': getNombreCargo(empleado.cargo_id),
      'Fecha Nacimiento': empleado.fecha_nacimiento ? new Date(empleado.fecha_nacimiento).toLocaleDateString() : 'N/A',
      'Fecha Ingreso': empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso).toLocaleDateString() : 'N/A',
      'Estado': empleado.estado
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');
    XLSX.writeFile(workbook, `empleados_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      <div className="empleados-container">
        <div className="empleados-header">
          <h2>Gestión de Empleados</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" onClick={exportarPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="btn-exportar btn-excel" onClick={exportarExcel}>
              <FaFileExcel /> Excel
            </button>
            {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') && (
              <button className="btn-nuevo" onClick={() => abrirModal()}>
                <FaPlus /> Nuevo Empleado
              </button>
            )}
          </div>
        </div>

        <div className="busqueda-seccion">
          <div className="busqueda-wrapper">
            <input
              type="text"
              className="input-busqueda"
              placeholder="Buscar por cédula, nombres, apellidos, cargo, usuario o fecha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <span className="resultados-info">
            Mostrando <strong>{empleadosPaginados.length}</strong> de <strong>{empleadosFiltrados.length}</strong> registros
          </span>
        </div>

        <div className="tabla-responsive">
        <table className="empleados-tabla">
        <thead>
          <tr>
            <th className="th-sortable" onClick={() => ordenarPor('cedula')}>
              Cédula {ordenamiento.campo === 'cedula' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-sortable" onClick={() => ordenarPor('nombres')}>
              Nombres {ordenamiento.campo === 'nombres' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-sortable" onClick={() => ordenarPor('apellidos')}>
              Apellidos {ordenamiento.campo === 'apellidos' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-sortable" onClick={() => ordenarPor('usuario')}>
              Usuario {ordenamiento.campo === 'usuario' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-sortable" onClick={() => ordenarPor('cargo')}>
              Cargo {ordenamiento.campo === 'cargo' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-sortable th-center" onClick={() => ordenarPor('estado')}>
              Estado {ordenamiento.campo === 'estado' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-sortable th-center" onClick={() => ordenarPor('fecha_ingreso')}>
              Fecha Ingreso {ordenamiento.campo === 'fecha_ingreso' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
            </th>
            <th className="th-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleadosPaginados.length === 0 ? (
            <tr>
              <td colSpan="8" className="no-data">No se encontraron empleados</td>
            </tr>
          ) : (
            empleadosPaginados.map(empleado => (
            <tr key={empleado.id}>
              <td>{empleado.cedula}</td>
              <td>{empleado.nombres}</td>
              <td>{empleado.apellidos}</td>
              <td>{Array.isArray(usuarios) ? (usuarios.find(u => u.id === empleado.id_usuario)?.username || 'Sin usuario') : 'Cargando...'}</td>
              <td>{getNombreCargo(empleado.cargo_id)}</td>
              <td className="td-center">
                <span className={`estado ${empleado.estado}`}>{empleado.estado}</span>
              </td>
              <td className="td-center">{empleado.fecha_ingreso}</td>
              <td className="td-center">
                <div className="acciones-grupo">
                  {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
                    <>
                      <button className="btn-icono editar" onClick={() => abrirModal(empleado)} title="Editar">
                        <FaEdit />
                      </button>
                      {(rolUsuario === 'admin' || rolUsuario === 'Administrador') && (
                        <button className="btn-icono eliminar" onClick={() => eliminarEmpleado(empleado.id)} title="Eliminar">
                          <FaTrash />
                        </button>
                      )}
                    </>
                  ) : empleado.id_usuario === idUsuarioActual ? (
                    <button className="btn-icono editar" onClick={() => abrirModal(empleado)} title="Editar">
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
      {empleadosFiltrados.length > 0 && (
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
              {[...Array(Math.ceil(empleadosFiltrados.length / registrosPorPagina))].map((_, index) => (
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
              disabled={paginaActual === Math.ceil(empleadosFiltrados.length / registrosPorPagina)}
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
              <h3>{modoEdicion ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
              <button className="btn-cerrar-modal" onClick={cerrarModal} type="button">
                <FaTimes />
              </button>
            </div>
            <form onSubmit={guardarEmpleado}>
              <div className="form-row">
                <div className="form-grupo">
                  <label>Nombres:</label>
                  <input
                    type="text"
                    value={empleadoActual.nombres}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, nombres: e.target.value})}
                    required
                  />
                </div>
                <div className="form-grupo">
                  <label>Apellidos:</label>
                  <input
                    type="text"
                    value={empleadoActual.apellidos}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, apellidos: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Cédula:</label>
                  <input
                    type="text"
                    value={empleadoActual.cedula}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, ''); // Solo números
                      if (valor.length <= 10) {
                        setEmpleadoActual({...empleadoActual, cedula: valor});
                      }
                    }}
                    minLength="10"
                    maxLength="10"
                    pattern="\d{10}"
                    required
                    title="La cédula debe tener exactamente 10 dígitos"
                    placeholder="1234567890"
                  />
                </div>
                <div className="form-grupo">
                  <label>Fecha Nacimiento:</label>
                  <input
                    type="date"
                    value={empleadoActual.fecha_nacimiento}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, fecha_nacimiento: e.target.value})}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    min="1940-01-01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Cargo:</label>
                  <select
                    value={empleadoActual.cargo_id}
                    onChange={(e) => manejarCambioCargo(e.target.value)}
                    required
                  >
                    <option value="">Seleccione un cargo</option>
                    {cargos.map(cargo => (
                      <option key={cargo.id} value={cargo.id}>
                        {cargo.nombre_cargo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Usuario (Opcional):</label>
                  <select
                    value={empleadoActual.id_usuario}
                    onChange={(e) => manejarCambioUsuario(e.target.value)}
                  >
                    <option value="">Sin usuario asignado</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.username} {usuario.rol && `(${usuario.rol})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Estado:</label>
                  <select
                    value={empleadoActual.estado}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, estado: e.target.value})}
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Fecha Ingreso:</label>
                  <input
                    type="date"
                    value={empleadoActual.fecha_ingreso || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, fecha_ingreso: e.target.value})}
                    min={empleadoActual.fecha_nacimiento || '1940-01-01'}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Tipo Cuenta y Banco:</label>
                  <input
                    type="text"
                    value={empleadoActual.tipo_cuenta_bancaria}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, tipo_cuenta_bancaria: e.target.value})}
                    placeholder="Ej: Ahorros - Banco Pichincha"
                  />
                </div>
                <div className="form-grupo">
                  <label>Número Cuenta:</label>
                  <input
                    type="text"
                    value={empleadoActual.numero_cuenta_bancaria}
                    onChange={(e) => {
                      const valor = e.target.value.replace(/\D/g, ''); // Solo números
                      if (valor.length <= 10) {
                        setEmpleadoActual({...empleadoActual, numero_cuenta_bancaria: valor});
                      }
                    }}
                    minLength="10"
                    maxLength="10"
                    pattern="\d{10}"
                    title="El número de cuenta debe tener exactamente 10 dígitos"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Modalidad Fondo Reserva:</label>
                  <select
                    value={empleadoActual.modalidad_fondo_reserva}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, modalidad_fondo_reserva: e.target.value})}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Acumulado">Acumulado</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Modalidad Décimos:</label>
                  <select
                    value={empleadoActual.modalidad_decimos}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, modalidad_decimos: e.target.value})}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Acumulado">Acumulado</option>
                  </select>
                </div>
              </div>

              {empleadoActual.estado === 'inactivo' && (
                <div className="form-grupo">
                  <label>Fecha Egreso:</label>
                  <input
                    type="date"
                    value={empleadoActual.fecha_egreso}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, fecha_egreso: e.target.value})}
                  />
                </div>
              )}

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

export default Empleados;
