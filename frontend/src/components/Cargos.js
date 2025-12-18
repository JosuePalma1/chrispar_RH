import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Sidebar from './Sidebar';
import './Cargos.css';
import { FaEdit, FaTrash, FaEye, FaFilePdf, FaFileExcel, FaPlus, FaTimes, FaSave } from 'react-icons/fa';
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

function Cargos() {
  const [cargos, setCargos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [cargoAEliminar, setCargoAEliminar] = useState(null);
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

  const abrirModal = useCallback((cargo = null) => {
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
  }, []);

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

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast(mensaje);
    setToastType(tipo);
    setTimeout(() => setToast(null), 5000);
  };

  const guardarCargo = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const payload = {
      ...cargoActual,
      sueldo_base: cargoActual.sueldo_base === '' || cargoActual.sueldo_base === null
        ? 0
        : Number(cargoActual.sueldo_base)
    };
    
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
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        mostrarToast(`Cargo ${modoEdicion ? 'actualizado' : 'creado'} exitosamente`, 'success');
        cargarCargos();
        cerrarModal();
      } else {
        const errorData = await response.json();
        mostrarToast(`Error: ${errorData.error || 'No se pudo guardar el cargo'}`, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarToast('Error de conexión al guardar el cargo', 'error');
    }
  };

  const confirmarEliminarCargo = useCallback((id) => {
    setCargoAEliminar(id);
    setModalConfirmacion(true);
  }, []);

  const eliminarCargo = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/cargos/${cargoAEliminar}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        mostrarToast('Cargo eliminado exitosamente', 'error');
        cargarCargos();
      } else {
        const error = await response.json();
        mostrarToast(`Error: ${error.error || 'No se pudo eliminar el cargo'}`, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarToast('Error al eliminar el cargo', 'error');
    }
    setModalConfirmacion(false);
    setCargoAEliminar(null);
  }, [cargoAEliminar]);

  // Definir columnas para TanStack Table
  const columns = useMemo(
    () => [
      {
        accessorKey: 'nombre_cargo',
        header: 'Cargo',
        cell: info => <span className="td-left">{info.getValue()}</span>,
        enableGlobalFilter: true,
        meta: { headerClassName: 'th-left', cellClassName: 'td-left' }
      },
      {
        accessorKey: 'sueldo_base',
        header: 'Salario Base (USD)',
        cell: info => <span className="td-left">${parseFloat(info.getValue()).toFixed(2)}</span>,
        enableGlobalFilter: false,
        meta: { headerClassName: 'th-left', cellClassName: 'td-left' }
      },
      {
        accessorKey: 'permisos',
        header: 'Permisos',
        cell: info => <span className="td-center">{(info.getValue() || []).length} módulos</span>,
        enableSorting: false,
        enableGlobalFilter: false,
        meta: { headerClassName: 'th-center', cellClassName: 'td-center' }
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="acciones-grupo">
            {(rolUsuario === 'admin' || rolUsuario === 'Administrador') ? (
              <>
                <button className="btn-icono editar" onClick={() => abrirModal(row.original)} title="Editar">
                  <FaEdit />
                </button>
                <button className="btn-icono eliminar" onClick={() => confirmarEliminarCargo(row.original.id)} title="Eliminar">
                  <FaTrash />
                </button>
              </>
            ) : (rolUsuario === 'Supervisor' || rolUsuario === 'supervisor') ? (
              <>
                <button className="btn-icono editar" onClick={() => abrirModal(row.original)} title="Editar">
                  <FaEdit />
                </button>
              </>
            ) : (
              <button className="btn-icono btn-ver" onClick={() => abrirModal(row.original)} title="Ver">
                <FaEye />
              </button>
            )}
          </div>
        ),
        enableSorting: false,
        enableGlobalFilter: false,
        meta: { headerClassName: 'th-center', cellClassName: 'td-center' }
      },
    ],
    [rolUsuario, abrirModal, confirmarEliminarCargo]
  );

  // Configurar la tabla con TanStack Table
  const table = useReactTable({
    data: cargos,
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
    doc.text('Reporte de Cargos', 14, 20);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    
    const datos = table.getFilteredRowModel().rows.map(row => [
      row.original.nombre_cargo,
      `$${parseFloat(row.original.sueldo_base).toFixed(2)}`,
      (row.original.permisos || []).length
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
    const datos = table.getFilteredRowModel().rows.map(row => ({
      'Cargo': row.original.nombre_cargo,
      'Sueldo Base (USD)': parseFloat(row.original.sueldo_base).toFixed(2),
      'Cantidad de Permisos': (row.original.permisos || []).length,
      'Permisos': (row.original.permisos || []).join(', ')
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
              <button className="btn-nuevo" onClick={() => abrirModal()} title="Nuevo Cargo">
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
              placeholder="Buscar por nombre del cargo..."
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
          <table className="cargos-tabla">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      className={`
                        ${header.column.getCanSort() ? 'th-sortable' : ''} 
                        ${header.column.columnDef.meta?.headerClassName || ''}
                      `.trim()}
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
                  <td colSpan={columns.length} className="no-data">No hay cargos que mostrar</td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className={cell.column.columnDef.meta?.cellClassName || ''}
                      >
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
            <button 
              onClick={() => table.previousPage()} 
              disabled={!table.getCanPreviousPage()}
              className="btn-paginacion"
            >
              Anterior
            </button>
            <div className="numeros-pagina">
              {[...Array(table.getPageCount())].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => table.setPageIndex(index)}
                  className={`btn-numero ${table.getState().pagination.pageIndex === index ? 'activo' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => table.nextPage()} 
              disabled={!table.getCanNextPage()}
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

      {toast && (
        <div className={`toast toast-${toastType}`}>
          {toast}
        </div>
      )}

      {modalConfirmacion && (
        <div className="modal">
          <div className="modal-contenido-confirmacion">
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de eliminar este cargo: <strong>"{cargos.find(c => c.id === cargoAEliminar)?.nombre_cargo}"</strong>?</p>
            <div className="form-botones">
              <button className="btn-eliminar" onClick={eliminarCargo}>
                Eliminar
              </button>
              <button className="btn-cancelar" onClick={() => setModalConfirmacion(false)}>
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

export default Cargos;
