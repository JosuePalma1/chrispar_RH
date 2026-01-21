'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Nominas.css';
import { FaFilePdf, FaFileExcel, FaPlus, FaTimes, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Nominas() {
  const [nominas, setNominas] = useState([]);
  const [empleadosList, setEmpleadosList] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', mes: '', sueldo_base: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewNomina, setViewNomina] = useState(null);
  const [editForm, setEditForm] = useState({ id_nomina: null, id_empleado: '', mes: '', sueldo_base: '' });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nominaToDelete, setNominaToDelete] = useState(null);
  // Rubros states
  const [rubroForm, setRubroForm] = useState({ tipo: '', monto: '', motivo: '', operacion: 'suma' });
  const [createRubroModalOpen, setCreateRubroModalOpen] = useState(false);
  const [editRubroModalOpen, setEditRubroModalOpen] = useState(false);
  const [editRubroForm, setEditRubroForm] = useState({ id_rubro: null, tipo: '', monto: '', motivo: '', operacion: 'suma' });
  const [deleteRubroConfirmOpen, setDeleteRubroConfirmOpen] = useState(false);
  const [rubroToDelete, setRubroToDelete] = useState(null);

  // Prevent non-numeric characters in numeric inputs
  const numericKeyDown = (e) => {
    const allowedKeys = [
      'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End',
      '.',
    ];
    if (allowedKeys.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (/^[0-9]$/.test(e.key)) return;
    e.preventDefault();
  };

useEffect(() => {
  fetchNominas();
  fetchEmpleados();
  fetchAllRubros();
}, []);

// Cargar TODOS los rubros al inicializar
const fetchAllRubros = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_URL}/api/rubros/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setRubros(res.data || []);
  } catch (err) {
    console.error('Error cargando rubros:', err);
    setRubros([]);
  }
};

  const handleSearch = (e) => setSearch(e.target.value);

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast(mensaje);
    setToastType(tipo);
    setTimeout(() => setToast(null), 5000);
  };

  const filteredNominas = Array.isArray(nominas)
    ? nominas.filter(n => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const empleado = empleadosList.find(emp => String(emp.id) === String(n.id_empleado));
      const empleadoNombre = empleado ? `${empleado.nombres} ${empleado.apellidos}`.toLowerCase() : '';
      const matchFields = Object.values(n).some(v => String(v ?? '').toLowerCase().includes(q));
      return matchFields || empleadoNombre.includes(q);
    })
    : [];

  const fetchNominas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nominas/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data.slice().sort((a,b) => (a.id_nomina || 0) - (b.id_nomina || 0)) : [];
      setNominas(list);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Sesión expirada. Por favor inicie sesión nuevamente.');
      } else {
        setError('Error al cargar nóminas');
      }
    } finally {
      setLoading(false);
    }
  };

// Función para calcular el total considerando rubros
const calcularTotalConRubros = (nominaBase) => {
  if (!nominaBase) return 0;
  
  // Asegurar que el sueldo base sea número
  let total = parseFloat(nominaBase.sueldo_base) || 0;
  
  // Filtrar rubros comparando IDs de forma segura (String vs Number)
  const rubrosNomina = rubros.filter(r => String(r.id_nomina) === String(nominaBase.id_nomina));
  
  rubrosNomina.forEach(rubro => {
    const monto = parseFloat(rubro.monto) || 0;
    
    // Convertir a minúsculas para evitar errores de mayúsculas/minúsculas desde la DB
    const operacion = String(rubro.operacion).toLowerCase();
    
    if (operacion === 'suma') {
      total += monto;
    } else if (operacion === 'resta') {
      total -= monto;
    }
  });
  
  return Math.max(0, total);
};

  const exportToExcel = () => {
    try {
      const dataToExport = filteredNominas.map(n => {
        const emp = empleadosList.find(emp => String(emp.id) === String(n.id_empleado));
        const empleadoNombre = emp ? `${emp.nombres} ${emp.apellidos}` : n.id_empleado;
        const totalConRubros = calcularTotalConRubros(n);
        return {
          ID: n.id_nomina,
          Mes: n.mes || n.fecha_generacion || '',
          Empleado: empleadoNombre,
          'Total a Desembolsar': totalConRubros.toFixed(2)
        };
      });
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Nominas');
      XLSX.writeFile(wb, `nominas_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      console.error('Error exportando a Excel', e);
      mostrarToast('Error al exportar a Excel', 'error');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const head = [['ID', 'Empleado', 'Mes', 'Total a Desembolsar']];
      const body = filteredNominas.map(n => {
        const emp = empleadosList.find(emp => String(emp.id) === String(n.id_empleado));
        const empleadoNombre = emp ? `${emp.nombres} ${emp.apellidos}` : n.id_empleado;
        const totalConRubros = calcularTotalConRubros(n);
        return [
          n.id_nomina,
          empleadoNombre,
          n.mes || n.fecha_generacion || '',
          totalConRubros.toFixed(2)
        ];
      });
      autoTable(doc, { head, body, startY: 14 });
      doc.text('Listado de Nóminas', 14, 10);
      doc.save(`nominas_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error('Error exportando a PDF', e);
      mostrarToast('Error al exportar a PDF', 'error');
    }
  };

  const fetchEmpleados = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/empleados/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEmpleadosList(res.data || []);
    } catch (err) {
      setEmpleadosList([]);
    }
  };

  const getEmpleadoNombre = (id) => {
    const emp = empleadosList.find(emp => String(emp.id) === String(id));
    return emp ? `${emp.nombres} ${emp.apellidos}` : id;
  };

  const months = [
    { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' }, { v: '04', l: 'Abril' },
    { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' }, { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' },
    { v: '09', l: 'Septiembre' }, { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' }
  ];
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 10; y <= currentYear + 5; y++) years.push(y);

  const handleMesSelect = (monthValue, yearValue) => {
    if (!monthValue || !yearValue) return;
    setForm(prev => ({ ...prev, mes: `${yearValue}-${monthValue}` }));
    setFormErrors(prev => { const c = { ...prev }; delete c.mes; return c; });
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setForm({ id_empleado: '', mes: '', sueldo_base: '' });
    setFormErrors({});
    setToast(null);
    setError('');
  };

  const handleCreate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = {};
    if (!form.id_empleado) {
      errors.id_empleado = 'Selecciona un empleado';
      mostrarToast(errors.id_empleado, 'error');
    } else if (!empleadosList.find(emp => String(emp.id) === String(form.id_empleado))) {
      errors.id_empleado = 'Empleado no válido';
      mostrarToast(errors.id_empleado, 'error');
    }

    if (!form.mes) {
      errors.mes = 'Selecciona el mes';
      mostrarToast(errors.mes, 'error');
    }

    const val = form.sueldo_base;
    if (val === '' || val === null || typeof val === 'undefined') {
      errors.sueldo_base = 'Requerido';
      mostrarToast(`Sueldo Base: ${errors.sueldo_base}`, 'error');
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(val))) {
      errors.sueldo_base = 'Formato numérico inválido';
      mostrarToast(`Sueldo Base: ${errors.sueldo_base}`, 'error');
    } else if (parseFloat(val) < 0) {
      errors.sueldo_base = 'No puede ser negativo';
      mostrarToast(`Sueldo Base: ${errors.sueldo_base}`, 'error');
    }

    // Validación: verificar que no exista ya una nómina para el mismo empleado y mes
    if (!errors.id_empleado && !errors.mes) {
      const existingNomina = nominas.find(n => 
        String(n.id_empleado) === String(form.id_empleado) && 
        (n.mes === form.mes || n.fecha_generacion === form.mes)
      );
      if (existingNomina) {
        const empleadoNombre = empleadosList.find(emp => String(emp.id) === String(form.id_empleado));
        const nombreCompleto = empleadoNombre ? `${empleadoNombre.nombres} ${empleadoNombre.apellidos}` : form.id_empleado;
        errors.duplicate = `Ya existe una nómina para ${nombreCompleto} en el mes ${form.mes}`;
        mostrarToast(errors.duplicate, 'error');
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      const token = localStorage.getItem('token');
      const sueldo_base = parseFloat(form.sueldo_base) || 0;
      const total_desembolsar = Number(sueldo_base.toFixed(2));
      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        mes: form.mes,
        sueldo_base,
        total_desembolsar,
        creado_por: 1
      };
      await axios.post(`${API_URL}/api/nominas/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      mostrarToast('Nómina creada exitosamente', 'success');
      closeCreateModal();
      fetchNominas();
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al crear la nómina. Verifica los datos ingresados';
      setError(message);
      mostrarToast(message, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/nominas/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      mostrarToast('Nómina eliminada', 'success');
      fetchNominas();
    } catch (err) {
      setError('Error al eliminar nómina');
      mostrarToast('Error al eliminar nómina', 'error');
    }
  };

  const confirmDeleteNomina = async () => {
    if (!nominaToDelete) return;
    await handleDelete(nominaToDelete.id_nomina);
    setNominaToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const cancelDeleteNomina = () => {
    setNominaToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const openEditModal = (nomina) => {
    const mesVal = nomina.mes || nomina.fecha_generacion || '';
    setEditForm({
      id_nomina: nomina.id_nomina,
      id_empleado: nomina.id_empleado,
      mes: mesVal,
      sueldo_base: (nomina.sueldo_base != null) ? String(nomina.sueldo_base) : ''
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const validateEdit = () => {
    const errors = {};
    if (!editForm.mes) errors.mes = 'Selecciona el mes';
    const val = editForm.sueldo_base;
    if (val === '' || val === null || typeof val === 'undefined') {
      errors.sueldo_base = 'Requerido';
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(val))) {
      errors.sueldo_base = 'Formato numérico inválido';
    } else if (parseFloat(val) < 0) {
      errors.sueldo_base = 'No puede ser negativo';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSave = async () => {
    if (!validateEdit()) return;
    try {
      const token = localStorage.getItem('token');
      const sueldo_base = parseFloat(editForm.sueldo_base) || 0;
      const total_desembolsar = Number(sueldo_base.toFixed(2));

      const payload = {
        mes: editForm.mes,
        sueldo_base,
        total_desembolsar
      };

      await axios.put(`${API_URL}/api/nominas/${editForm.id_nomina}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      await fetchNominas();
      setViewNomina(null);
      setEditModalOpen(false);
      mostrarToast('Nómina actualizada correctamente', 'success');
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al actualizar nómina';
      setError(message);
      mostrarToast(message, 'error');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'sueldo_base') {
      if (value === '' || value === null) {
        setFormErrors(prev => ({ ...prev, [name]: 'Requerido' }));
      } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(value))) {
        setFormErrors(prev => ({ ...prev, [name]: 'Formato numérico inválido' }));
      } else {
        setFormErrors(prev => { const c = { ...prev }; delete c[name]; return c; });
      }
    }
    if (name === 'mes') {
      if (!value) {
        setFormErrors(prev => ({ ...prev, mes: 'Selecciona el mes' }));
      } else {
        setFormErrors(prev => { const c = { ...prev }; delete c.mes; return c; });
      }
    }
  };

  // ===== FUNCIONES PARA RUBROS =====
const fetchRubros = async (id_nomina) => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_URL}/api/rubros/?id_nomina=${id_nomina}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Actualizar el estado global de rubros con los datos más recientes
    const nuevosRubros = res.data || [];
    setRubros(prevRubros => {
      // Filtrar los rubros que NO son de esta nómina y agregar los nuevos
      const rubrosOtras = prevRubros.filter(r => r.id_nomina !== id_nomina);
      return [...rubrosOtras, ...nuevosRubros];
    });
  } catch (err) {
    console.error('Error al cargar rubros de la nómina:', err);
  }
};

  const openViewModal = (nomina) => {
    setViewNomina(nomina);
    fetchRubros(nomina.id_nomina);
  };

const handleCreateRubro = async () => {
  if (!viewNomina) return;
  const errors = {};
  if (!rubroForm.tipo) errors.tipo = 'Tipo requerido';
  if (!rubroForm.monto || parseFloat(rubroForm.monto) <= 0) errors.monto = 'Monto válido requerido';
  if (!rubroForm.motivo) errors.motivo = 'Motivo requerido';
  if (!['suma', 'resta'].includes(rubroForm.operacion)) errors.operacion = 'Operación inválida';
  
  if (Object.keys(errors).length) {
    setFormErrors(errors);
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const payload = {
      id_nomina: viewNomina.id_nomina,
      tipo: rubroForm.tipo,
      monto: parseFloat(rubroForm.monto),
      motivo: rubroForm.motivo,
      operacion: rubroForm.operacion, // suma o resta
      creado_por: 1
    };
    await axios.post(`${API_URL}/api/rubros/`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    mostrarToast('Rubro creado exitosamente', 'success');
    setCreateRubroModalOpen(false);
    setRubroForm({ tipo: '', monto: '', motivo: '', operacion: 'suma' });
    setFormErrors({});
    // Recargar rubros para actualizar la tabla y los totales
    await fetchRubros(viewNomina.id_nomina);
  } catch (err) {
    const message = err.response?.data?.error || 'Error al crear rubro';
    mostrarToast(message, 'error');
  }
};

const handleUpdateRubro = async () => {
  if (!viewNomina) return;
  const errors = {};
  if (!editRubroForm.tipo) errors.tipo = 'Tipo requerido';
  if (!editRubroForm.monto || parseFloat(editRubroForm.monto) <= 0) errors.monto = 'Monto válido requerido';
  if (!editRubroForm.motivo) errors.motivo = 'Motivo requerido';
  if (!['suma', 'resta'].includes(editRubroForm.operacion)) errors.operacion = 'Operación inválida';
  
  if (Object.keys(errors).length) {
    setFormErrors(errors);
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const payload = {
      tipo: editRubroForm.tipo,
      monto: parseFloat(editRubroForm.monto),
      motivo: editRubroForm.motivo,
      operacion: editRubroForm.operacion // suma o resta
    };
    await axios.put(`${API_URL}/api/rubros/${editRubroForm.id_rubro}`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    mostrarToast('Rubro actualizado exitosamente', 'success');
    setEditRubroModalOpen(false);
    setFormErrors({});
    // Recargar rubros para actualizar
    await fetchRubros(viewNomina.id_nomina);
  } catch (err) {
    const message = err.response?.data?.error || 'Error al actualizar rubro';
    mostrarToast(message, 'error');
  }
};

const handleDeleteRubro = async (id_rubro) => {
  if (!viewNomina) return;
  try {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/api/rubros/${id_rubro}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    mostrarToast('Rubro eliminado', 'success');
    // Recargar rubros para actualizar
    await fetchRubros(viewNomina.id_nomina);
  } catch (err) {
    mostrarToast('Error al eliminar rubro', 'error');
  }
};

  const openEditRubroModal = (rubro) => {
    setEditRubroForm({
      id_rubro: rubro.id_rubro,
      tipo: rubro.tipo,
      monto: rubro.monto,
      motivo: rubro.motivo,
      operacion: rubro.operacion
    });
    setEditRubroModalOpen(true);
  };

  const closeCreateRubroModal = () => {
    setCreateRubroModalOpen(false);
    setRubroForm({ tipo: '', monto: '', motivo: '', operacion: 'suma' });
    setFormErrors({});
  };

  const closeEditRubroModal = () => {
    setEditRubroModalOpen(false);
    setEditRubroForm({ id_rubro: null, tipo: '', monto: '', motivo: '', operacion: 'suma' });
    setFormErrors({});
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="nominas-container main-with-sidebar">
        <div className="nominas-header">
          <h2>Gestión de Nóminas</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" title="Exportar PDF" onClick={exportToPDF}><FaFilePdf /> PDF</button>
            <button className="btn-exportar btn-excel" title="Exportar Excel" onClick={exportToExcel}><FaFileExcel /> Excel</button>
            <button className="btn-nuevo" onClick={() => { setCreateModalOpen(true); setForm({ id_empleado: '', mes: '', sueldo_base: '' }); setFormErrors({}); }} title="Crear Nómina"><FaPlus /></button>
          </div>
        </div>
        {toast && (
          <div className={`nominas-toast toast-${toastType}`}>
            {toast}
          </div>
        )}

        <div className="busqueda-seccion">
          <div className="busqueda-wrapper">
            <input
              type="text"
              placeholder="Buscar en nóminas..."
              value={search}
              onChange={handleSearch}
              className="input-busqueda"
            />
          </div>
          <span className="resultados-info">Mostrando <strong>{Array.isArray(filteredNominas) ? filteredNominas.length : 0}</strong> registros</span>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="tabla-responsive">
            <table className="usuarios-tabla">
              <thead>
                <tr>
                  <th>Nº Nómina</th>
                  <th>Empleado</th>
                  <th>Mes</th>
                  <th>Total a Desembolsar</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredNominas.map(n => (
                  <tr key={n.id_nomina}>
                    <td className="td-center">{n.id_nomina}</td>
                    <td className="td-center">{getEmpleadoNombre(n.id_empleado)}</td>
                    <td className="td-center">{n.mes || n.fecha_generacion || ''}</td>
                    <td className="td-center">${calcularTotalConRubros(n).toFixed(2)}</td>
                    <td className="td-center">
                      <div className="acciones-grupo">
                        <button className="btn-icono editar" onClick={() => openEditModal(n)} title="Editar"><FaEdit /></button>
                        <button className="btn-icono eliminar" onClick={() => { setNominaToDelete(n); setDeleteConfirmOpen(true); }} title="Eliminar"><FaTrash /></button>
                        <button className="btn-icono ver" onClick={() => openViewModal(n)} title="Ver"><FaEye /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteConfirmOpen && (
          <div className="modal">
            <div className="modal-contenido">
              <div className="modal-header">
                <h3>Confirmar eliminación</h3>
                <button className="btn-cerrar-modal" onClick={cancelDeleteNomina} type="button"><FaTimes /></button>
              </div>
              <div className="form-grupo">
                <p>¿Estás seguro de eliminar la nómina <strong>#{nominaToDelete && nominaToDelete.id_nomina}</strong> del empleado <strong>{nominaToDelete ? getEmpleadoNombre(nominaToDelete.id_empleado) : ''}</strong> ?</p>
              </div>
              <div className="form-botones">
                <button className="btn-guardar" onClick={confirmDeleteNomina}>Eliminar</button>
                <button className="btn-cancelar" onClick={cancelDeleteNomina}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {editModalOpen && (
          <div className="modal">
            <div className="modal-contenido">
              <div className="modal-header">
                <h3>Editar Nómina #{editForm.id_nomina}</h3>
                <button className="btn-cerrar-modal" onClick={() => setEditModalOpen(false)} type="button"><FaTimes /></button>
              </div>
              <div className="form-grupo">
                <label>Empleado</label>
                <div>{getEmpleadoNombre(editForm.id_empleado)}</div>
              </div>
              <div className="form-grupo">
                <label>Mes</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="mes_month" value={(editForm.mes && editForm.mes.split('-')[1]) || ''} onChange={(e) => setEditForm(prev => ({ ...prev, mes: `${(editForm.mes && editForm.mes.split('-')[0]) || currentYear}-${e.target.value}` }))}>
                    <option value="">Mes</option>
                    {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                  <select name="mes_year" value={(editForm.mes && editForm.mes.split('-')[0]) || currentYear} onChange={(e) => setEditForm(prev => ({ ...prev, mes: `${e.target.value}-${(editForm.mes && editForm.mes.split('-')[1]) || String(new Date().getMonth()+1).padStart(2,'0')}` }))}>
                    <option value="">Año</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                {formErrors.mes && <div className="field-error">{formErrors.mes}</div>}
              </div>
              <div className="form-grupo">
                <label>Sueldo Base</label>
                <input name="sueldo_base" type="number" step="0.01" min="0" value={editForm.sueldo_base || ''} onChange={handleEditChange} onKeyDown={numericKeyDown} />
                {formErrors.sueldo_base && <div className="field-error">{formErrors.sueldo_base}</div>}
              </div>
              <div className="form-grupo">
                <label>Total a Desembolsar (Base)</label>
                <div className="readonly-currency">${Number(editForm.sueldo_base || 0).toFixed(2)}</div>
                <small style={{color: '#666'}}>Los rubros se suman o restan de este valor</small>
              </div>
              <div className="form-botones">
                <button className="btn-guardar" onClick={handleEditSave}>Guardar</button>
                <button className="btn-cancelar" onClick={() => setEditModalOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {createModalOpen && (
          <div className="modal">
            <div className="modal-contenido">
              <div className="modal-header">
                <h3>Crear Nómina</h3>
                <button className="btn-cerrar-modal" onClick={closeCreateModal} type="button"><FaTimes /></button>
              </div>
              <div className="form-grupo">
                <label>Empleado</label>
                <select name="id_empleado" value={form.id_empleado} onChange={handleFormChange}>
                  <option value="">-- Seleccionar empleado --</option>
                  {empleadosList.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nombres} {emp.apellidos} (#{emp.id})</option>
                  ))}
                </select>
                {formErrors.id_empleado && <div className="field-error">{formErrors.id_empleado}</div>}
              </div>
              <div className="form-grupo">
                <label>Mes</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="mes_month" value={(form.mes && form.mes.split('-')[1]) || ''} onChange={(e) => handleMesSelect(e.target.value, (form.mes && form.mes.split('-')[0]) || currentYear)}>
                    <option value="">Mes</option>
                    {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                  <select name="mes_year" value={(form.mes && form.mes.split('-')[0]) || currentYear} onChange={(e) => handleMesSelect((form.mes && form.mes.split('-')[1]) || String(new Date().getMonth()+1).padStart(2,'0'), e.target.value)}>
                    <option value="">Año</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                {formErrors.mes && <div className="field-error">{formErrors.mes}</div>}
              </div>
              <div className="form-grupo">
                <label>Sueldo Base</label>
                <input name="sueldo_base" type="number" step="0.01" min="0" value={form.sueldo_base || ''} onChange={handleFormChange} onKeyDown={numericKeyDown} />
                {formErrors.sueldo_base && <div className="field-error">{formErrors.sueldo_base}</div>}
              </div>
              <div className="form-botones">
                <button className="btn-guardar" onClick={handleCreate}>Guardar</button>
                <button className="btn-cancelar" onClick={closeCreateModal}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {viewNomina && (
          <div className="modal">
            <div className="modal-contenido" style={{maxHeight: '90vh', overflowY: 'auto'}}>
              <div className="modal-header">
                <h3>Detalle Nómina #{viewNomina.id_nomina}</h3>
                <button className="btn-cerrar-modal" onClick={() => setViewNomina(null)} type="button"><FaTimes /></button>
              </div>
              
              <div className="form-grupo">
                <label>Empleado</label>
                <div>{getEmpleadoNombre(viewNomina.id_empleado)}</div>
              </div>
              <div className="form-grupo">
                <label>Mes</label>
                <div>{viewNomina.mes || viewNomina.fecha_generacion || ''}</div>
              </div>
              <div className="form-grupo">
                <label>Sueldo Base</label>
                <div>${(viewNomina.sueldo_base ?? 0).toFixed(2)}</div>
              </div>

              <div className="form-grupo">
                <label>Rubros (Devengos/Deducciones)</label>
                <button className="btn-nuevo" onClick={() => setCreateRubroModalOpen(true)} style={{ marginBottom: '10px' }}><FaPlus /> Agregar Rubro</button>
                
                <div className="tabla-responsive">
                  <table className="usuarios-tabla">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Operación</th>
                        <th>Motivo</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                  <tbody>
                    {/* FILTRO AÑADIDO AQUÍ: .filter(...) */}
                    {rubros.filter(r => String(r.id_nomina) === String(viewNomina.id_nomina)).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No hay rubros registrados</td>
                      </tr>
                    ) : (
                      rubros
                        .filter(r => String(r.id_nomina) === String(viewNomina.id_nomina))
                        .map(r => (
                          <tr key={r.id_rubro}>
                            <td>{r.tipo}</td>
                            <td>${parseFloat(r.monto).toFixed(2)}</td>
                            <td>
                              <strong style={{color: String(r.operacion).toLowerCase() === 'suma' ? '#28a745' : '#dc3545'}}>
                                {String(r.operacion).toLowerCase() === 'suma' ? '✓ Suma' : '✗ Resta'}
                              </strong>
                            </td>
                            <td>{r.motivo || '-'}</td>
                            <td className="td-center">
                              <div className="acciones-grupo">
                                <button className="btn-icono editar" onClick={() => openEditRubroModal(r)} title="Editar"><FaEdit /></button>
                                <button className="btn-icono eliminar" onClick={() => { setRubroToDelete(r); setDeleteRubroConfirmOpen(true); }} title="Eliminar"><FaTrash /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                  </table>
                </div>
              </div>

              <div className="form-grupo" style={{backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px', marginTop: '15px'}}>
                <label style={{fontWeight: 'bold', fontSize: '16px'}}>Total a Desembolsar</label>
                <div style={{fontSize: '24px', color: '#28a745', fontWeight: 'bold'}}>
                  ${calcularTotalConRubros(viewNomina).toFixed(2)}
                </div>
                <small style={{color: '#666', marginTop: '5px', display: 'block'}}>
                  Sueldo Base: ${(viewNomina.sueldo_base || 0).toFixed(2)} + Rubros
                </small>
              </div>

              <div className="form-botones">
                <button className="btn-cancelar" onClick={() => setViewNomina(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

          {createRubroModalOpen && (
            <div className="modal">
              <div className="modal-contenido">
                <div className="modal-header">
                  <h3>Crear Rubro - Nómina #{viewNomina?.id_nomina}</h3>
                  <button className="btn-cerrar-modal" onClick={closeCreateRubroModal} type="button"><FaTimes /></button>
                </div>
                <div className="form-grupo">
                  <label>Tipo</label>
                  <select name="tipo" value={rubroForm.tipo} onChange={(e) => {
                    const nuevoTipo = e.target.value;
                    const nuevaOperacion = nuevoTipo === 'deduccion' ? 'resta' : 'suma';
                    setRubroForm({ ...rubroForm, tipo: nuevoTipo, operacion: nuevaOperacion });
                  }}>
                    <option value="">-- Seleccionar tipo --</option>
                    <option value="devengo">Devengo (Suma)</option>
                    <option value="deduccion">Deducción (Resta)</option>
                  </select>
                  {formErrors.tipo && <div className="field-error">{formErrors.tipo}</div>}
                </div>
                <div className="form-grupo">
                  <label>Monto</label>
                  <input name="monto" type="number" step="0.01" min="0" value={rubroForm.monto} onChange={(e) => setRubroForm({ ...rubroForm, monto: e.target.value })} onKeyDown={numericKeyDown} />
                  {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
                </div>
                <div className="form-grupo">
                  <label>Motivo</label>
                  <textarea name="motivo" value={rubroForm.motivo} onChange={(e) => setRubroForm({ ...rubroForm, motivo: e.target.value })} placeholder="Describe el motivo de este rubro" />
                  {formErrors.motivo && <div className="field-error">{formErrors.motivo}</div>}
                </div>
                <div className="form-botones">
                  <button className="btn-guardar" onClick={handleCreateRubro}>Guardar</button>
                  <button className="btn-cancelar" onClick={closeCreateRubroModal}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

            {editRubroModalOpen && (
              <div className="modal">
                <div className="modal-contenido">
                  <div className="modal-header">
                    <h3>Editar Rubro #{editRubroForm.id_rubro}</h3>
                    <button className="btn-cerrar-modal" onClick={closeEditRubroModal} type="button"><FaTimes /></button>
                  </div>
                  <div className="form-grupo">
                    <label>Tipo</label>
                    <select name="tipo" value={editRubroForm.tipo} onChange={(e) => {
                      const nuevoTipo = e.target.value;
                      const nuevaOperacion = nuevoTipo === 'deduccion' ? 'resta' : 'suma';
                      setEditRubroForm({ ...editRubroForm, tipo: nuevoTipo, operacion: nuevaOperacion });
                    }}>
                      <option value="">-- Seleccionar tipo --</option>
                      <option value="devengo">Devengo (Suma)</option>
                      <option value="deduccion">Deducción (Resta)</option>
                    </select>
                    {formErrors.tipo && <div className="field-error">{formErrors.tipo}</div>}
                  </div>
                  <div className="form-grupo">
                    <label>Monto</label>
                    <input name="monto" type="number" step="0.01" min="0" value={editRubroForm.monto} onChange={(e) => setEditRubroForm({ ...editRubroForm, monto: e.target.value })} onKeyDown={numericKeyDown} />
                    {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
                  </div>
                  <div className="form-grupo">
                    <label>Motivo</label>
                    <textarea name="motivo" value={editRubroForm.motivo} onChange={(e) => setEditRubroForm({ ...editRubroForm, motivo: e.target.value })} placeholder="Describe el motivo de este rubro" />
                    {formErrors.motivo && <div className="field-error">{formErrors.motivo}</div>}
                  </div>
                  <div className="form-botones">
                    <button className="btn-guardar" onClick={handleUpdateRubro}>Guardar</button>
                    <button className="btn-cancelar" onClick={closeEditRubroModal}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

        {deleteRubroConfirmOpen && (
          <div className="modal">
            <div className="modal-contenido">
              <div className="modal-header">
                <h3>Confirmar eliminación</h3>
                <button className="btn-cerrar-modal" onClick={() => { setRubroToDelete(null); setDeleteRubroConfirmOpen(false); }} type="button"><FaTimes /></button>
              </div>
              <div className="form-grupo">
                <p>¿Estás seguro de eliminar el rubro <strong>{rubroToDelete ? rubroToDelete.tipo : ''}</strong> por ${(rubroToDelete?.monto || 0).toFixed(2)}?</p>
              </div>
              <div className="form-botones">
                <button className="btn-guardar" onClick={() => { handleDeleteRubro(rubroToDelete.id_rubro); setRubroToDelete(null); setDeleteRubroConfirmOpen(false); }}>Eliminar</button>
                <button className="btn-cancelar" onClick={() => { setRubroToDelete(null); setDeleteRubroConfirmOpen(false); }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Nominas;
