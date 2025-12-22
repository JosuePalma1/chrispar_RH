import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Sidebar from './Sidebar';
import './Usuarios.css';
import { FaEdit, FaTrash, FaEye, FaFilePdf, FaFileExcel, FaPlus, FaTimes } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  const [idUsuarioActual, setIdUsuarioActual] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
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

  const verificarTieneEmpleado = useCallback((idUsuario) => {
    return empleados.some(emp => emp.id_usuario === idUsuario);
  }, [empleados]);

  const irACrearEmpleado = (usuario) => {
    // Guardar datos del usuario en sessionStorage para prellenar el formulario de empleado
    sessionStorage.setItem('usuarioParaEmpleado', JSON.stringify(usuario));
    window.location.href = '/empleados?crear=true';
  };

  const abrirModal = useCallback((usuario = null) => {
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
  }, []);

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast(mensaje);
    setToastType(tipo);
    setTimeout(() => setToast(null), 5000);
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
        mostrarToast('Usuario guardado exitosamente', 'success');
        cargarUsuarios();
        cerrarModal();
      } else {
        const error = await response.json();
        mostrarToast(`Error: ${error.error || 'No se pudo guardar el usuario'}`, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarToast('Error al guardar el usuario', 'error');
    }
  };

  const confirmarEliminarUsuario = useCallback((id) => {
    setUsuarioAEliminar(id);
    setModalConfirmacion(true);
  }, []);

  const eliminarUsuario = useCallback(async () => {
    if (!usuarioAEliminar) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/usuarios/${usuarioAEliminar}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        mostrarToast('Usuario eliminado exitosamente', 'success');
        cargarUsuarios();
      } else {
        const error = await response.json();
        mostrarToast(`Error: ${error.error || 'No se pudo eliminar el usuario'}`, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarToast('Error al eliminar el usuario', 'error');
    }
    setModalConfirmacion(false);
    setUsuarioAEliminar(null);
  }, [usuarioAEliminar]);

  // Filtrar datos según permisos del usuario
  const datosVisibles = useMemo(() => {
    if (!Array.isArray(usuarios)) return [];
    const esAdminOSupervisor = rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor';
    if (!esAdminOSupervisor) {
      return usuarios.filter(u => u.id === idUsuarioActual);
    }
    return usuarios;
  }, [usuarios, rolUsuario, idUsuarioActual]);

  // Definir columnas para TanStack Table
  const columns = useMemo(
    () => [
      {
        accessorKey: 'username',
        header: 'Username',
        cell: info => info.getValue(),
        enableGlobalFilter: true,
      },
      {
        accessorKey: 'rol',
        header: 'Rol',
        cell: info => <span className={`rol ${info.getValue()}`}>{info.getValue()}</span>,
        enableGlobalFilter: true,
      },
      {
        accessorKey: 'fecha_creacion',
        header: 'Fecha Creación',
        cell: info => {
          const fecha = info.getValue();
          return <span className="td-center">{fecha ? new Date(fecha).toLocaleDateString() : 'N/A'}</span>;
        },
        enableGlobalFilter: true,
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => {
          const usuario = row.original;
          const tieneEmpleado = verificarTieneEmpleado(usuario.id);
          return (
            <div className="acciones-grupo">
              {(rolUsuario === 'admin' || rolUsuario === 'Administrador' || rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
                <>
                  <button className="btn-icono editar" onClick={() => abrirModal(usuario)} title="Editar">
                    <FaEdit />
                  </button>
                  {(rolUsuario === 'admin' || rolUsuario === 'Administrador') && (
                    <button className="btn-icono eliminar" onClick={() => confirmarEliminarUsuario(usuario.id)} title="Eliminar">
                      <FaTrash />
                    </button>
                  )}
                  {!tieneEmpleado && (
                    <button
                      className="btn-completar-empleado"
                      onClick={() => irACrearEmpleado(usuario)}
                      title="Completar datos del empleado"
                      aria-label="Completar datos del empleado"
                      type="button"
                    >
                      <FaPlus />
                    </button>
                  )}

                  {tieneEmpleado && (
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
          );
        },
        enableSorting: false,
        enableGlobalFilter: false,
      },
    ],
    [rolUsuario, idUsuarioActual, empleados, verificarTieneEmpleado, confirmarEliminarUsuario, abrirModal]
  );

  // Configurar la tabla con TanStack Table
  const table = useReactTable({
    data: datosVisibles,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    state: {
      globalFilter: busqueda,
    },
    onGlobalFilterChange: setBusqueda,
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  // Cuando cambia la búsqueda, volver a la primera página
  useEffect(() => {
    table.setPageIndex(0);
  }, [busqueda, table]);

  // Si al eliminar/regargar datos quedamos fuera de rango, ajustar página
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  useEffect(() => {
    if (pageCount > 0 && pageIndex > pageCount - 1) {
      table.setPageIndex(Math.max(pageCount - 1, 0));
    }
  }, [pageCount, pageIndex, table]);

  // Exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Usuarios', 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const datos = table.getFilteredRowModel().rows.map(row => [
      row.original.username,
      row.original.rol,
      new Date(row.original.fecha_creacion).toLocaleDateString()
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
    const datos = table.getFilteredRowModel().rows.map(row => ({
      'Usuario': row.original.username,
      'Rol': row.original.rol,
      'Fecha Creación': new Date(row.original.fecha_creacion).toLocaleDateString()
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
              <button className="btn-nuevo" onClick={() => abrirModal()} title="Nuevo Usuario">
                <FaPlus />
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
              onChange={(e) => setBusqueda(e.target.value)}
              className="input-busqueda"
            />
          </div>
          <span className="resultados-info">
            Mostrando <strong>{table.getRowModel().rows.length}</strong> de <strong>{table.getFilteredRowModel().rows.length}</strong> registros
          </span>
        </div>

        <div className="tabla-responsive">
          <table className="usuarios-tabla">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      className={header.column.getCanSort() ? 'th-sortable' : ''}
                      style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span>
                          {header.column.getIsSorted() === 'asc' && ' ▲'}
                          {header.column.getIsSorted() === 'desc' && ' ▼'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="no-data">No hay usuarios que mostrar</td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="td-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {table.getPageCount() > 1 && (
          <div className="paginacion">
            <div className="paginacion-controles">
              <button 
                className="btn-paginacion" 
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </button>
              
              <div className="numeros-pagina">
                {[...Array(table.getPageCount())].map((_, index) => (
                  <button
                    key={index + 1}
                    className={`btn-numero ${table.getState().pagination.pageIndex === index ? 'activo' : ''}`}
                    onClick={() => table.setPageIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button 
                className="btn-paginacion" 
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
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

      {toast && (
        <div className={`usuarios-toast toast-${toastType}`}>
          {toast}
        </div>
      )}

      {modalConfirmacion && (
        <div className="modal">
          <div className="modal-contenido-confirmacion">
            <h3>Confirmar eliminación</h3>
            <p>
              ¿Estás seguro de eliminar este usuario: <strong>"{usuarios.find(u => u.id === usuarioAEliminar)?.username}"</strong>?
            </p>
            <div className="form-botones">
              <button className="btn-eliminar" onClick={eliminarUsuario}>
                Eliminar
              </button>
              <button className="btn-cancelar" onClick={() => { setModalConfirmacion(false); setUsuarioAEliminar(null); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Usuarios;
