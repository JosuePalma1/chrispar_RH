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
  const [form, setForm] = useState({ id_empleado: '', mes: '', sueldo_base: '', horas_extra: '', total_desembolsar: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewNomina, setViewNomina] = useState(null);
  const openViewModal = (nomina) => setViewNomina(nomina);
  const [editForm, setEditForm] = useState({ id_nomina: null, id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

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

  const filteredNominas = Array.isArray(nominas) && search.trim()
    ? nominas.filter(n => Object.values(n).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : nominas;

  const fetchNominas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nominas/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNominas(res.data);
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
      const dataToExport = filteredNominas.map(n => ({
        ID: n.id_nomina,
        Mes: n.mes || n.fecha_generacion || '',
        Empleado: n.id_empleado,
        'Total a Desembolsar': n.total_desembolsar ?? n.total ?? 0,
        Estado: n.estado || ''
      }));
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
      const head = [['ID', 'Mes', 'Empleado', 'Total a Desembolsar', 'Estado']];
      const body = filteredNominas.map(n => [
        n.id_nomina,
        n.mes || n.fecha_generacion || '',
        n.id_empleado,
        n.total_desembolsar ?? n.total ?? 0,
        n.estado || ''
      ]);
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

    // sueldo_base, horas_extra, total_desembolsar validations
    const numericFields = ['sueldo_base', 'horas_extra', 'total_desembolsar'];
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

    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        mes: form.mes,
        sueldo_base: parseFloat(form.sueldo_base) || 0,
        horas_extra: parseFloat(form.horas_extra) || 0,
        total_desembolsar: parseFloat(form.total_desembolsar) || 0,
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
    if (!window.confirm('¿Eliminar esta nómina?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/nominas/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNominas();
    } catch (err) {
      setError('Error al eliminar nómina');
    }
  };

  const openEditModal = (nomina) => {
    setEditForm({
      id_nomina: nomina.id_nomina,
      id_empleado: nomina.id_empleado,
      fecha_inicio: nomina.fecha_inicio || '',
      fecha_fin: nomina.fecha_fin || '',
      total: nomina.total || nomina.total_desembolsar || 0,
      estado: nomina.estado || ''
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const validateEdit = () => {
    const errors = {};
    const fechaInicioVal = editForm.fecha_inicio ? Date.parse(editForm.fecha_inicio) : NaN;
    const fechaFinVal = editForm.fecha_fin ? Date.parse(editForm.fecha_fin) : NaN;
    if (!editForm.fecha_inicio || isNaN(fechaInicioVal)) errors.fecha_inicio = 'Fecha inicio inválida';
    if (!editForm.fecha_fin || isNaN(fechaFinVal)) errors.fecha_fin = 'Fecha fin inválida';
    if (!errors.fecha_inicio && !errors.fecha_fin && fechaInicioVal > fechaFinVal) errors.fecha_fin = 'Fecha fin debe ser posterior o igual a fecha inicio';
    if (editForm.total === '' || editForm.total === null || typeof editForm.total === 'undefined') {
      errors.total = 'Total requerido';
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(editForm.total))) {
      errors.total = 'Total debe ser numérico con hasta 2 decimales';
    } else if (parseFloat(editForm.total) < 0) {
      errors.total = 'Total no puede ser negativo';
    } else if (parseFloat(editForm.total) > 1000000000) {
      errors.total = 'Total demasiado grande';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSave = async () => {
    if (!validateEdit()) return;
    try {
      const token = localStorage.getItem('token');
      const payload = {
        fecha_inicio: editForm.fecha_inicio,
        fecha_fin: editForm.fecha_fin,
        total: parseFloat(editForm.total) || 0
      };
      await axios.put(`${API_URL}/api/nominas/${editForm.id_nomina}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEditModalOpen(false);
      fetchNominas();
      alert('Nómina actualizada correctamente');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar nómina');
      alert(err.response?.data?.error || 'Error al actualizar nómina');
    }
  };

  // update form change to support new create fields and real-time validation
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // realtime numeric validation
    if (['sueldo_base', 'horas_extra', 'total_desembolsar'].includes(name)) {
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
              <th>Mes</th>
              <th>Total a Desembolsar</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredNominas.map(n => (
              <tr key={n.id_nomina}>
                <td className="td-center">{n.id_nomina}</td>
                <td className="td-center">{n.mes || n.fecha_generacion || ''}</td>
                <td className="td-center">{Number(n.total_desembolsar ?? n.total ?? 0).toFixed(2)}</td>
                <td className="td-center">
                  <div className="acciones-grupo">
                    <button className="btn-icono editar" onClick={() => openEditModal(n)} title="Editar"><FaEdit /></button>
                    <button className="btn-icono eliminar" onClick={() => handleDelete(n.id_nomina)} title="Eliminar"><FaTrash /></button>
                    <button className="btn-icono ver" onClick={() => openViewModal(n)} title="Ver"><FaEye /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
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
              <label>Fecha Inicio</label>
              <input name="fecha_inicio" type="date" value={editForm.fecha_inicio} onChange={handleEditChange} />
              {formErrors.fecha_inicio && <div className="field-error">{formErrors.fecha_inicio}</div>}
            </div>
            <div className="form-grupo">
              <label>Fecha Fin</label>
              <input name="fecha_fin" type="date" value={editForm.fecha_fin} onChange={handleEditChange} />
              {formErrors.fecha_fin && <div className="field-error">{formErrors.fecha_fin}</div>}
            </div>
            <div className="form-grupo">
              <label>Total</label>
              <input name="total" type="number" step="0.01" min="0" value={editForm.total} onChange={handleEditChange} onKeyDown={numericKeyDown} />
              {formErrors.total && <div className="field-error">{formErrors.total}</div>}
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
              <input name="mes" type="month" value={form.mes || ''} onChange={handleFormChange} />
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
            <div className="form-grupo">
              <label>Total a Desembolsar</label>
              <input name="total_desembolsar" type="number" step="0.01" min="0" value={form.total_desembolsar || ''} onChange={handleFormChange} onKeyDown={numericKeyDown} />
              {formErrors.total_desembolsar && <div className="field-error">{formErrors.total_desembolsar}</div>}
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
          <div className="modal-contenido">
            <div className="modal-header">
              <h3>Detalle Nómina #{viewNomina.id_nomina}</h3>
              <button className="btn-cerrar-modal" onClick={() => setViewNomina(null)} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <label>Empleado</label>
              <div>{viewNomina.id_empleado}</div>
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
