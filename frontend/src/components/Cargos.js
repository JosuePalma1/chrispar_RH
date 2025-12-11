import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import './Cargos.css';
import { FaEdit, FaTrash, FaEye, FaFilePdf, FaFileExcel, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Cargos() {
  const [cargos, setCargos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [ordenamiento, setOrdenamiento] = useState({ campo: null, direccion: 'asc' });
  const [rolUsuario, setRolUsuario] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 5;
  const modalRef = useRef(null);
  const [cargoActual, setCargoActual] = useState({
    id: null,
    nombre_cargo: '',
    sueldo_base: '',
    permisos: []
  });

  const modulosDisponibles = [
    { id: 'dashboard', nombre: 'Dashboard' },
    { id: 'cargos', nombre: 'Cargos' },
    { id: 'usuarios', nombre: 'Usuarios' },
    { id: 'empleados', nombre: 'Empleados' },
    { id: 'hojas-vida', nombre: 'Hojas de Vida' },
    { id: 'horarios', nombre: 'Horarios' },
    { id: 'asistencias', nombre: 'Asistencias' },
    { id: 'permisos', nombre: 'Permisos/Vacaciones' },
    { id: 'nomina', nombre: 'Nómina' },
    { id: 'rubros', nombre: 'Rubros de Pago' },
    { id: 'logs', nombre: 'Logs de Auditoría' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRolUsuario(payload.rol || '');
      } catch (e) {
        console.error('Error al decodificar token:', e);
      }
    }
    cargarCargos();
  }, []);

  const cargarCargos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cargos/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar cargos');
        return;
      }
      
      const data = await response.json();
      setCargos(data);
      setError('');
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión al cargar cargos');
    }
  };

  const abrirModal = (cargo = null) => {
    if (cargo) {
      setCargoActual({
        ...cargo,
        permisos: cargo.permisos || []
      });
      setModoEdicion(true);
    } else {
      setCargoActual({
        id: null,
        nombre_cargo: '',
        sueldo_base: '',
        permisos: ['dashboard'] // Dashboard por defecto
      });
      setModoEdicion(false);
    }
    setMostrarModal(true);
  };

  const togglePermiso = (moduloId) => {
    const permisosActuales = [...cargoActual.permisos];
    if (permisosActuales.includes(moduloId)) {
      // Si ya tiene el permiso, quitarlo (excepto dashboard que es obligatorio)
      if (moduloId !== 'dashboard') {
        setCargoActual({
          ...cargoActual,
          permisos: permisosActuales.filter(p => p !== moduloId)
        });
      }
    } else {
      // Si no tiene el permiso, agregarlo
      setCargoActual({
        ...cargoActual,
        permisos: [...permisosActuales, moduloId]
      });
    }
  };

  const seleccionarTodos = () => {
    const todosLosModulos = modulosDisponibles.map(m => m.id);
    setCargoActual({
      ...cargoActual,
      permisos: todosLosModulos
    });
  };

  const deseleccionarTodos = () => {
    setCargoActual({
      ...cargoActual,
      permisos: ['dashboard'] // Solo mantener dashboard
    });
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setCargoActual({
      id: null,
      nombre_cargo: '',
      sueldo_base: '',
      permisos: []
    });
  };

  const guardarCargo = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const url = modoEdicion 
        ? `${API_URL}/api/cargos/${cargoActual.id}`
        : `${API_URL}/api/cargos/`;
      
      const method = modoEdicion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cargoActual)
      });

      if (response.ok) {
        alert(`Cargo ${modoEdicion ? 'actualizado' : 'creado'} exitosamente`);
        cargarCargos();
        cerrarModal();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'No se pudo guardar el cargo'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión al guardar el cargo');
    }
  };

  const eliminarCargo = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cargo?')) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/cargos/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          alert('Cargo eliminado exitosamente');
          cargarCargos();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error || 'No se pudo eliminar el cargo'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el cargo');
      }
    }
  };

  const ordenarPor = (campo) => {
    const direccion = ordenamiento.campo === campo && ordenamiento.direccion === 'asc' ? 'desc' : 'asc';
    setOrdenamiento({ campo, direccion });
  };

  const obtenerCargosFiltradosYOrdenados = () => {
    let resultado = cargos.filter(cargo => 
      cargo.nombre_cargo.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (ordenamiento.campo) {
      resultado.sort((a, b) => {
        let valorA = a[ordenamiento.campo];
        let valorB = b[ordenamiento.campo];

        if (ordenamiento.campo === 'sueldo_base') {
          valorA = parseFloat(valorA);
          valorB = parseFloat(valorB);
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
  const cargosFiltrados = obtenerCargosFiltradosYOrdenados();
  const totalPaginas = Math.ceil(cargosFiltrados.length / registrosPorPagina);
  const indiceInicio = (paginaActual - 1) * registrosPorPagina;
  const indiceFin = indiceInicio + registrosPorPagina;
  const cargosPaginados = cargosFiltrados.slice(indiceInicio, indiceFin);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Cargos', 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const datos = cargosFiltrados.map(cargo => [
      cargo.nombre_cargo,
      `$${parseFloat(cargo.sueldo_base).toFixed(2)}`,
      (cargo.permisos || []).length
    ]);

    autoTable(doc, {
      head: [['Cargo', 'Sueldo Base (USD)', 'Permisos']],
      body: datos,
      startY: 35,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255] }
    });

    doc.save(`cargos_${new Date().getTime()}.pdf`);
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const datos = cargosFiltrados.map(cargo => ({
      'Cargo': cargo.nombre_cargo,
      'Sueldo Base (USD)': parseFloat(cargo.sueldo_base).toFixed(2),
      'Cantidad de Permisos': (cargo.permisos || []).length,
      'Permisos': (cargo.permisos || []).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cargos');
    XLSX.writeFile(workbook, `cargos_${new Date().getTime()}.xlsx`);
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
      <div className="cargos-container">
        <div className="cargos-header">
          <h2>Gestión de Cargos</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" onClick={exportarPDF} title="Exportar a PDF">
              <FaFilePdf /> PDF
            </button>
            <button className="btn-exportar btn-excel" onClick={exportarExcel} title="Exportar a Excel">
              <FaFileExcel /> Excel
            </button>
            {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') && (
              <button className="btn-nuevo" onClick={() => abrirModal()}>
                <FaPlus /> Nuevo Cargo
              </button>
            )}
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="busqueda-seccion">
          <div className="busqueda-wrapper">
            <input
              type="text"
              placeholder="Buscar por nombre del cargo..."
              value={busqueda}
              onChange={(e) => {setBusqueda(e.target.value); setPaginaActual(1);}}
              className="input-busqueda"
            />
          </div>
          <span className="resultados-info">
            Mostrando <strong>{cargosPaginados.length}</strong> de <strong>{cargosFiltrados.length}</strong> registros
          </span>
        </div>

        <div className="tabla-responsive">
          <table className="cargos-tabla">
            <thead>
              <tr>
                <th onClick={() => ordenarPor('nombre_cargo')} className="th-sortable">
                  Cargo {ordenamiento.campo === 'nombre_cargo' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => ordenarPor('sueldo_base')} className="th-sortable th-right">
                  Salario Base (USD) {ordenamiento.campo === 'sueldo_base' && (ordenamiento.direccion === 'asc' ? '▲' : '▼')}
                </th>
                <th className="th-center">Permisos</th>
                <th className="th-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-data">No hay cargos que mostrar</td>
                </tr>
              ) : (
                cargosPaginados.map(cargo => (
                  <tr key={cargo.id}>
                    <td className="td-left">{cargo.nombre_cargo}</td>
                    <td className="td-right">${parseFloat(cargo.sueldo_base).toFixed(2)}</td>
                    <td className="td-center">{(cargo.permisos || []).length} módulos</td>
                    <td className="td-center">
                      <div className="acciones-grupo">
                        {(rolUsuario === 'admin' || rolUsuario === 'Administrador') ? (
                          <>
                            <button className="btn-icono editar" onClick={() => abrirModal(cargo)} title="Editar">
                              <FaEdit />
                            </button>
                            <button className="btn-icono eliminar" onClick={() => eliminarCargo(cargo.id)} title="Eliminar">
                              <FaTrash />
                            </button>
                          </>
                        ) : (rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
                          <>
                            <button className="btn-icono editar" onClick={() => abrirModal(cargo)} title="Editar">
                              <FaEdit />
                            </button>
                          </>
                        ) : (
                          <button className="btn-icono btn-ver" onClick={() => abrirModal(cargo)} title="Ver">
                            <FaEye />
                          </button>
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
        {totalPaginas > 1 && (
          <div className="paginacion">
            <button 
              onClick={() => cambiarPagina(paginaActual - 1)} 
              disabled={paginaActual === 1}
              className="btn-paginacion"
            >
              Anterior
            </button>
            <div className="numeros-pagina">
              {[...Array(totalPaginas)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => cambiarPagina(index + 1)}
                  className={`btn-numero ${paginaActual === index + 1 ? 'activo' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => cambiarPagina(paginaActual + 1)} 
              disabled={paginaActual === totalPaginas}
              className="btn-paginacion"
            >
              Siguiente
            </button>
          </div>
        )}

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-contenido" ref={modalRef}>
            <div className="modal-header">
              <h3>{modoEdicion ? 'Editar Cargo' : 'Nuevo Cargo'}</h3>
              <button className="btn-cerrar-modal" onClick={cerrarModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={guardarCargo}>
              <div className="form-grupo">
                <label>Nombre del Cargo:</label>
                <input
                  type="text"
                  value={cargoActual.nombre_cargo}
                  onChange={(e) => setCargoActual({...cargoActual, nombre_cargo: e.target.value})}
                  minLength="3"
                  maxLength="50"
                  required
                  title="El nombre debe tener entre 3 y 50 caracteres"
                />
              </div>
              <div className="form-grupo">
                <label>Sueldo Base:</label>
                <input
                  type="number"
                  step="0.01"
                  value={cargoActual.sueldo_base}
                  onChange={(e) => setCargoActual({...cargoActual, sueldo_base: e.target.value})}
                  min="0.01"
                  required
                  title="El sueldo debe ser mayor a 0"
                />
              </div>
              
              <div className="form-grupo">
                <label>Módulos Permitidos:</label>
                <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                  <button type="button" onClick={seleccionarTodos} style={{padding: '5px 15px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px'}}>Seleccionar Todos</button>
                  <button type="button" onClick={deseleccionarTodos} style={{padding: '5px 15px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px'}}>Deseleccionar Todos</button>
                </div>
                <div className="permisos-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  marginTop: '10px',
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}>
                  {modulosDisponibles.map(modulo => (
                    <label key={modulo.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: modulo.id === 'dashboard' ? 'not-allowed' : 'pointer',
                      opacity: modulo.id === 'dashboard' ? 0.6 : 1
                    }}>
                      <input
                        type="checkbox"
                        checked={cargoActual.permisos.includes(modulo.id)}
                        onChange={() => togglePermiso(modulo.id)}
                        disabled={modulo.id === 'dashboard'}
                        style={{ cursor: modulo.id === 'dashboard' ? 'not-allowed' : 'pointer' }}
                      />
                      <span>{modulo.nombre}</span>
                      {modulo.id === 'dashboard' && <span style={{fontSize: '11px', color: '#666'}}>(obligatorio)</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-botones">
                <button type="submit" className="btn-guardar">
                  <FaSave /> Guardar
                </button>
                <button type="button" className="btn-cancelar" onClick={cerrarModal}>
                  <FaTimes /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Cargos;
