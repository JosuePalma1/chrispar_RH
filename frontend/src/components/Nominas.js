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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', mes: '', sueldo_base: '', horas_extra: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewNomina, setViewNomina] = useState(null);
  const openViewModal = (nomina) => setViewNomina(nomina);
  const [editForm, setEditForm] = useState({ id_nomina: null, id_empleado: '', mes: '', sueldo_base: '', horas_extra: '' });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nominaToDelete, setNominaToDelete] = useState(null);

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
  }, []);

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
      // search existing nomina fields
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

  const exportToExcel = () => {
    try {
      const dataToExport = filteredNominas.map(n => {
        const emp = empleadosList.find(emp => String(emp.id) === String(n.id_empleado));
        const empleadoNombre = emp ? `${emp.nombres} ${emp.apellidos}` : n.id_empleado;
        return {
          ID: n.id_nomina,
          Mes: n.mes || n.fecha_generacion || '',
          Empleado: empleadoNombre,
          'Total a Desembolsar': n.total_desembolsar ?? n.total ?? 0
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
        return [
          n.id_nomina,
          empleadoNombre,
          n.mes || n.fecha_generacion || '',
          n.total_desembolsar ?? n.total ?? 0
        ];
      });
      // use autoTable plugin
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
      // silence: dropdown can be empty if unauthenticated
      setEmpleadosList([]);
    }
  };

  const getEmpleadoNombre = (id) => {
    const emp = empleadosList.find(emp => String(emp.id) === String(id));
    return emp ? `${emp.nombres} ${emp.apellidos}` : id;
  };

  // month/year selector helpers (allow selecting years beyond current)
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setForm({ id_empleado: '', mes: '', sueldo_base: '', horas_extra: '', total_desembolsar: '' });
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

    // mes (YYYY-MM) obligatorio
    if (!form.mes) {
      errors.mes = 'Selecciona el mes';
      mostrarToast(errors.mes, 'error');
    }
    // sueldo_base, horas_extra validations
    const numericFields = ['sueldo_base', 'horas_extra'];
    numericFields.forEach(field => {
      const val = form[field];
      if (val === '' || val === null || typeof val === 'undefined') {
        errors[field] = 'Requerido';
        mostrarToast(`${field.replace('_', ' ')}: ${errors[field]}`, 'error');
      } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(val))) {
        errors[field] = 'Formato numérico inválido';
        mostrarToast(`${field.replace('_', ' ')}: ${errors[field]}`, 'error');
      } else if (parseFloat(val) < 0) {
        errors[field] = 'No puede ser negativo';
        mostrarToast(`${field.replace('_', ' ')}: ${errors[field]}`, 'error');
      }
    });

    // horas_extra cannot be greater than sueldo_base
    if (!errors.sueldo_base && !errors.horas_extra) {
      const sb = parseFloat(form.sueldo_base) || 0;
      const he = parseFloat(form.horas_extra) || 0;
      if (he > sb) {
        errors.horas_extra = 'Horas extra no puede ser mayor al sueldo base';
        mostrarToast(errors.horas_extra, 'error');
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      const token = localStorage.getItem('token');
      const sueldo_base = parseFloat(form.sueldo_base) || 0;
      const horas_extra = parseFloat(form.horas_extra) || 0;
      const total_desembolsar = Number((sueldo_base + horas_extra).toFixed(2));
      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        mes: form.mes,
        sueldo_base,
        horas_extra,
        total_desembolsar,
        creado_por: 1
      };
      await axios.post(`${API_URL}/api/nominas/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      mostrarToast('Nómina creada exitosamente', 'success');
      // cerrar modal y limpiar estado
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
    // determine mes value
    const mesVal = nomina.mes || nomina.fecha_generacion || '';
    setEditForm({
      id_nomina: nomina.id_nomina,
      id_empleado: nomina.id_empleado,
      mes: mesVal,
      sueldo_base: (nomina.sueldo_base != null) ? String(nomina.sueldo_base) : '',
      horas_extra: (nomina.horas_extra != null) ? String(nomina.horas_extra) : ''
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const validateEdit = () => {
    const errors = {};
    if (!editForm.mes) errors.mes = 'Selecciona el mes';
    // sueldo_base and horas_extra validations
    ['sueldo_base', 'horas_extra'].forEach(field => {
      const val = editForm[field];
      if (val === '' || val === null || typeof val === 'undefined') {
        errors[field] = 'Requerido';
      } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(val))) {
        errors[field] = 'Formato numérico inválido';
      } else if (parseFloat(val) < 0) {
        errors[field] = 'No puede ser negativo';
      }
    });
    // horas_extra cannot exceed sueldo_base
    if (!errors.sueldo_base && !errors.horas_extra) {
      const sb = parseFloat(editForm.sueldo_base) || 0;
      const he = parseFloat(editForm.horas_extra) || 0;
      if (he > sb) errors.horas_extra = 'Horas extra no puede ser mayor al sueldo base';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

const handleEditSave = async () => {
  if (!validateEdit()) return;
  try {
    const token = localStorage.getItem('token');
    const sueldo_base = parseFloat(editForm.sueldo_base) || 0;
    const horas_extra = parseFloat(editForm.horas_extra) || 0;
    
    // Calculamos el total para enviarlo al backend
    const total_desembolsar = Number((sueldo_base + horas_extra).toFixed(2));

    const payload = {
      mes: editForm.mes,
      sueldo_base,
      horas_extra,
      total_desembolsar
    };

    await axios.put(`${API_URL}/api/nominas/${editForm.id_nomina}`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 1. Refrescar los datos directamente del servidor (LA SOLUCIÓN MÁS SEGURA)
    await fetchNominas();

    // 2. Si el modal de "Ver Detalle" está abierto para esta nómina, lo cerramos o actualizamos
    setViewNomina(null); 

    // 3. Cerramos el modal de edición y notificamos
    setEditModalOpen(false);
    mostrarToast('Nómina actualizada correctamente', 'success');

  } catch (err) {
    const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al actualizar nómina';
    setError(message);
    mostrarToast(message, 'error');
  }
};

  // update form change to support new create fields and real-time validation
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // realtime numeric validation
    if (['sueldo_base', 'horas_extra'].includes(name)) {
      if (value === '' || value === null) {
        setFormErrors(prev => ({ ...prev, [name]: 'Requerido' }));
        mostrarToast(`${name.replace('_', ' ')}: Requerido`, 'error');
      } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(value))) {
        setFormErrors(prev => ({ ...prev, [name]: 'Formato numérico inválido' }));
        mostrarToast(`${name.replace('_', ' ')}: Formato numérico inválido`, 'error');
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

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="nominas-container">
        <div className="nominas-header">
          <h2>Gestión de Nóminas</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" title="Exportar PDF" onClick={exportToPDF}><FaFilePdf /> PDF</button>
            <button className="btn-exportar btn-excel" title="Exportar Excel" onClick={exportToExcel}><FaFileExcel /> Excel</button>
            <button className="btn-nuevo" onClick={() => { setCreateModalOpen(true); setForm({ id_empleado: '', mes: '', sueldo_base: '', horas_extra: '', total_desembolsar: '' }); setFormErrors({}); }} title="Crear Nómina"><FaPlus /></button>
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
                <td className="td-center">{(empleadosList.find(emp => String(emp.id) === String(n.id_empleado)) ? `${empleadosList.find(emp => String(emp.id) === String(n.id_empleado)).nombres} ${empleadosList.find(emp => String(emp.id) === String(n.id_empleado)).apellidos}` : n.id_empleado)}</td>
                <td className="td-center">{n.mes || n.fecha_generacion || ''}</td>
                <td className="td-center">{Number(n.total_desembolsar ?? n.total ?? 0).toFixed(2)}</td>
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
              <label>Horas Extra</label>
              <input name="horas_extra" type="number" step="0.01" min="0" value={editForm.horas_extra || ''} onChange={handleEditChange} onKeyDown={numericKeyDown} />
              {formErrors.horas_extra && <div className="field-error">{formErrors.horas_extra}</div>}
            </div>
            <div className="form-grupo">
              <label>Total a Desembolsar</label>
              <div className="readonly-currency">${Number((parseFloat(editForm.sueldo_base || 0) + parseFloat(editForm.horas_extra || 0))).toFixed(2)}</div>
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
            <div className="form-grupo">
              <label>Horas Extra</label>
              <input name="horas_extra" type="number" step="0.01" min="0" value={form.horas_extra || ''} onChange={handleFormChange} onKeyDown={numericKeyDown} />
              {formErrors.horas_extra && <div className="field-error">{formErrors.horas_extra}</div>}
            </div>
            {/* total_desembolsar se calcula automáticamente: sueldo_base + horas_extra */}
            <div className="form-botones">
              <button className="btn-guardar" onClick={handleCreate}>Guardar</button>
              <button className="btn-cancelar" onClick={closeCreateModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {viewNomina && (
        <div className="modal">
          <div className="modal-contenido">
            <div className="modal-header">
              <h3>Detalle Nómina #{viewNomina.id_nomina}</h3>
              <button className="btn-cerrar-modal" onClick={() => setViewNomina(null)} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <label>Empleado</label>
              <div>{(empleadosList.find(emp => String(emp.id) === String(viewNomina.id_empleado)) ? `${empleadosList.find(emp => String(emp.id) === String(viewNomina.id_empleado)).nombres} ${empleadosList.find(emp => String(emp.id) === String(viewNomina.id_empleado)).apellidos}` : viewNomina.id_empleado)}</div>
            </div>
            <div className="form-grupo">
              <label>Mes</label>
              <div>{viewNomina.mes || viewNomina.fecha_generacion || ''}</div>
            </div>
            <div className="form-grupo">
              <label>Sueldo Base</label>
              <div>{viewNomina.sueldo_base ?? '-'}</div>
            </div>
            <div className="form-grupo">
              <label>Horas Extra</label>
              <div>{viewNomina.horas_extra ?? '-'}</div>
            </div>
            <div className="form-grupo">
              <label>Total a Desembolsar</label>
              <div>{viewNomina.total_desembolsar ?? viewNomina.total ?? '-'}</div>
            </div>
            <div className="form-botones">
              <button className="btn-cancelar" onClick={() => setViewNomina(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Nominas;
