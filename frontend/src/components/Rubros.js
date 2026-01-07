import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Rubros.css';
import { FaFilePdf, FaFileExcel, FaPlus, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Rubros() {
  const [rubros, setRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_nomina: '', tipo: 'devengo', monto: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nominasList, setNominasList] = useState([]);
  const [empleadosList, setEmpleadosList] = useState([]);
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id_rubro: null, id_nomina: '', motivo: '', tipo: 'devengo', monto: '' });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rubroToDelete, setRubroToDelete] = useState(null);

  useEffect(() => {
    fetchRubros();
  }, []);

  useEffect(() => {
    fetchNominasList();
    fetchEmpleados();
  }, []);

  const handleSearch = (e) => setSearch(e.target.value);

  const filteredRubros = Array.isArray(rubros)
    ? rubros.filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const nom = nominasList.find(n => String(n.id_nomina) === String(r.id_nomina));
      const empleado = nom ? empleadosList.find(emp => String(emp.id) === String(nom.id_empleado)) : null;
      const empleadoNombre = empleado ? `${empleado.nombres} ${empleado.apellidos}`.toLowerCase() : '';
      const nominaLabel = `#${r.id_nomina}`;
      const matchFields = [String(r.id_rubro), nominaLabel, empleadoNombre, String(r.motivo ?? '').toLowerCase(), String(r.tipo ?? '').toLowerCase(), String(r.monto ?? '').toLowerCase()];
      return matchFields.some(v => v.includes(q));
    }) : [];

  const fetchRubros = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/rubros/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data.slice().sort((a,b) => (a.id_rubro || 0) - (b.id_rubro || 0)) : [];
      setRubros(list);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Sesión expirada. Por favor inicie sesión nuevamente.');
      } else {
        setError('Error al cargar rubros');
      }
    } finally {
      setLoading(false);
    }
  };

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast(mensaje);
    setToastType(tipo);
    setTimeout(() => setToast(null), 5000);
  };

  const fetchNominasList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/nominas/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNominasList(res.data || []);
    } catch (err) {
      setNominasList([]);
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

  const exportToExcel = () => {
    try {
      const dataToExport = filteredRubros.map((r, i) => {
        const nom = nominasList.find(n => String(n.id_nomina) === String(r.id_nomina));
        const emp = nom ? empleadosList.find(e => String(e.id) === String(nom.id_empleado)) : null;
        const empleadoNombre = emp ? `${emp.nombres} ${emp.apellidos}` : (nom ? nom.id_empleado : '');
        return {
          'Nº Rubro': i + 1,
          'Nómina': r.id_nomina,
          'Empleado': empleadoNombre,
          'Motivo': r.motivo ?? '',
          'Tipo': r.tipo ?? '',
          'Monto': Number(r.monto ?? 0).toFixed(2)
        };
      });
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rubros');
      XLSX.writeFile(wb, `rubros_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      console.error('Error exportando a Excel', e);
      alert('Error al exportar a Excel');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const head = [['Nº Rubro', 'Nómina', 'Empleado', 'Motivo', 'Tipo', 'Monto']];
      const body = filteredRubros.map((r, i) => {
        const nom = nominasList.find(n => String(n.id_nomina) === String(r.id_nomina));
        const emp = nom ? empleadosList.find(e => String(e.id) === String(nom.id_empleado)) : null;
        const empleadoNombre = emp ? `${emp.nombres} ${emp.apellidos}` : (nom ? nom.id_empleado : '');
        return [i + 1, r.id_nomina, empleadoNombre, r.motivo ?? '', r.tipo ?? '', Number(r.monto ?? 0).toFixed(2)];
      });
      autoTable(doc, { head, body, startY: 14 });
      doc.text('Listado de Rubros', 14, 10);
      doc.save(`rubros_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error('Error exportando a PDF', e);
      alert('Error al exportar a PDF');
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Prevent non-numeric characters in numeric inputs (block letters like 'e' etc.)
const numericKeyDown = (e) => {
    // Permitir: borrar, tab, flechas, escape, enter y el punto decimal
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Escape', 'Enter', '.'];
    if (allowedKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) return;
    
    // Bloquear si no es un número
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
    
    // Bloquear si ya hay un punto y se intenta poner otro
    if (e.key === '.' && editForm.monto.includes('.')) {
      e.preventDefault();
    }
  };

  const handleCreate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errors = {};
    // Nómina válida
    if (!form.id_nomina) {
      errors.id_nomina = 'Selecciona una nómina';
    } else if (!nominasList.find(n => String(n.id_nomina) === String(form.id_nomina))) {
      errors.id_nomina = 'Nómina no válida';
    }
    // Motivo
    if (!form.motivo || form.motivo.trim() === '') {
      errors.motivo = 'Motivo requerido';
    } else if (String(form.motivo).trim().length > 255) {
      errors.motivo = 'Motivo demasiado largo (máx 255 caracteres)';
    }
    // Tipo
    if (!['devengo', 'deduccion'].includes(form.tipo)) errors.tipo = 'Tipo inválido';
    // Monto
    if (form.monto === '' || form.monto === null || typeof form.monto === 'undefined') {
      errors.monto = 'Monto requerido';
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(form.monto))) {
      errors.monto = 'Monto debe ser numérico con hasta 2 decimales';
    } else if (parseFloat(form.monto) < 0) {
      errors.monto = 'Monto no puede ser negativo';
    } else if (parseFloat(form.monto) > 1000000000) {
      errors.monto = 'Monto demasiado grande';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        id_nomina: parseInt(form.id_nomina, 10),
        motivo: String(form.motivo || '').trim(),
        tipo: form.tipo,
        monto: parseFloat(form.monto) || 0,
        creado_por: 1
      };
      await axios.post(`${API_URL}/api/rubros/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      mostrarToast('Rubro creado exitosamente', 'warning');
      setForm({ id_nomina: '', motivo: '', tipo: 'devengo', monto: '' });
      setCreateModalOpen(false);
      fetchRubros();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al crear rubro';
      setError(msg);
      mostrarToast(msg, 'error');
    }
  };

  const handleDelete = (id) => {
    const r = rubros.find(rr => String(rr.id_rubro) === String(id));
    setRubroToDelete(r || { id_rubro: id });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!rubroToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/rubros/${rubroToDelete.id_rubro}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDeleteConfirmOpen(false);
      setRubroToDelete(null);
      mostrarToast('Rubro eliminado', 'success');
      fetchRubros();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar rubro';
      setError(msg);
      mostrarToast(msg, 'error');
    }
  };

  const cancelDelete = () => { setDeleteConfirmOpen(false); setRubroToDelete(null); };

const openEditModal = (rubro) => {
    setEditForm({
      id_rubro: rubro.id_rubro,
      id_nomina: rubro.id_nomina,
      motivo: rubro.motivo || '',
      tipo: rubro.tipo || 'devengo',
      // Aseguramos que sea un string con 2 decimales para el input
      monto: rubro.monto ? String(parseFloat(rubro.monto)) : '0'
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    // Si es monto, permitimos que el usuario escriba libremente (el keyDown y la validación se encargan)
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const validateEdit = () => {
    const errors = {};
    if (!editForm.motivo || String(editForm.motivo).trim() === '') errors.motivo = 'Motivo requerido';
    else if (String(editForm.motivo).trim().length > 255) errors.motivo = 'Motivo demasiado largo (máx 255 caracteres)';
    if (!['devengo', 'deduccion', 'egreso', 'ingreso'].includes(editForm.tipo)) errors.tipo = 'Tipo inválido';
    if (editForm.monto === '' || editForm.monto === null || typeof editForm.monto === 'undefined') {
      errors.monto = 'Monto requerido';
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(editForm.monto))) {
      errors.monto = 'Monto debe ser numérico con hasta 2 decimales';
    } else if (parseFloat(editForm.monto) < 0) {
      errors.monto = 'Monto no puede ser negativo';
    } else if (parseFloat(editForm.monto) > 1000000000) {
      errors.monto = 'Monto demasiado grande';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSave = async () => {
  if (!validateEdit()) return;
  try {
    const token = localStorage.getItem('token');
    const payload = {
      motivo: String(editForm.motivo || '').trim(),
      tipo: editForm.tipo,
      monto: parseFloat(editForm.monto) || 0
    };
    
    console.log('[v0] Enviando actualización:', payload);
    
    const response = await axios.put(`${API_URL}/api/rubros/${editForm.id_rubro}`, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('[v0] Respuesta del servidor:', response.data);
    
    // Cerrar modal primero
    setEditModalOpen(false);
    
    // Luego recargar datos
    await fetchRubros();
    
    console.log('[v0] Datos recargados');
    
    mostrarToast('Rubro actualizado correctamente', 'success');
  } catch (err) {
    const msg = err.response?.data?.error || 'Error al actualizar rubro';
    setError(msg);
    mostrarToast(msg, 'error');
    console.log('[v0] Error al actualizar:', err);
  }
};

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="rubros-container main-with-sidebar">
        <div className="rubros-header">
          <h2>Rubros de Pago</h2>
            <div className="header-actions">
            <button className="btn-exportar btn-pdf" title="Exportar PDF" onClick={exportToPDF}><FaFilePdf /> PDF</button>
            <button className="btn-exportar btn-excel" title="Exportar Excel" onClick={exportToExcel}><FaFileExcel /> Excel</button>
            <button className="btn-nuevo" onClick={() => { setCreateModalOpen(true); setForm({ id_nomina: '', motivo: '', tipo: 'devengo', monto: '' }); setFormErrors({}); }} title="Crear Rubro"><FaPlus /></button>
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
              placeholder="Buscar en rubros..."
              value={search}
              onChange={handleSearch}
              className="input-busqueda"
            />
          </div>
          <span className="resultados-info">Mostrando <strong>{Array.isArray(filteredRubros) ? filteredRubros.length : 0}</strong> registros</span>
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
              <th>Nº Rubro</th>
              <th>Nómina / Empleado</th>
              <th>Motivo</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRubros.map((r, idx) => {
              const nom = nominasList.find(n => String(n.id_nomina) === String(r.id_nomina));
              const empName = nom ? getEmpleadoNombre(nom.id_empleado) : '';
              return (
                <tr key={r.id_rubro}>
                  <td className="td-center">{r.id_rubro}</td>
                  <td className="td-center">{`${r.id_nomina}/${empName}`}</td>
                  <td className="td-center">{r.motivo ?? ''}</td>
                  <td className="td-center">{r.tipo}</td>
                  <td className="td-center">${Number(r.monto ?? 0).toFixed(2)}</td>
                  <td className="td-center">
                    <div className="acciones-grupo">
                        <button className="btn-icono editar" onClick={() => openEditModal(r)} title="Editar"><FaEdit /></button>
                        <button className="btn-icono eliminar" onClick={() => handleDelete(r.id_rubro)} title="Eliminar"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}
      {/* Edit Modal */}
      {editModalOpen && (
        <div className="modal">
          <div className="modal-contenido">
            <div className="modal-header">
              <h3>Editar Rubro #{editForm.id_rubro}</h3>
              <button className="btn-cerrar-modal" onClick={() => setEditModalOpen(false)} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <label>Motivo</label>
              <input name="motivo" value={editForm.motivo || ''} onChange={handleEditChange} />
              {formErrors.motivo && <div className="field-error">{formErrors.motivo}</div>}
            </div>
            <div className="form-grupo">
              <label>Tipo</label>
              <select name="tipo" value={editForm.tipo} onChange={handleEditChange}>
                <option value="devengo">Devengo</option>
                <option value="deduccion">Deducción</option>
              </select>
              {formErrors.tipo && <div className="field-error">{formErrors.tipo}</div>}
            </div>
            <div className="form-grupo">
  <label>Monto</label>
  <input
    name="monto"
    type="text"
    inputMode="decimal"
    placeholder="0.00"
    value={editForm.monto}
    onChange={handleEditChange}
    onKeyDown={numericKeyDown}
  />
  {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
</div>
            <div className="form-botones">
              <button className="btn-guardar" onClick={handleEditSave}>Guardar</button>
              <button className="btn-cancelar" onClick={() => setEditModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmOpen && (
        <div className="modal">
          <div className="modal-contenido">
            <div className="modal-header">
              <h3>Confirmar eliminación</h3>
              <button className="btn-cerrar-modal" onClick={cancelDelete} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <p>¿Estás seguro de eliminar el rubro <strong>#{rubroToDelete && rubroToDelete.id_rubro}</strong> de la nómina <strong>{rubroToDelete ? rubroToDelete.id_nomina : ''}</strong> ?</p>
            </div>
            <div className="form-botones">
              <button className="btn-guardar" onClick={confirmDelete}>Eliminar</button>
              <button className="btn-cancelar" onClick={cancelDelete}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {createModalOpen && (
        <div className="modal">
          <div className="modal-contenido">
            <div className="modal-header">
              <h3>Crear Rubro</h3>
              <button className="btn-cerrar-modal" onClick={() => setCreateModalOpen(false)} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <label>Nómina</label>
              <select name="id_nomina" value={form.id_nomina} onChange={handleChange}>
                <option value="">-- Seleccionar nómina --</option>
                {nominasList.map(n => (
                  <option key={n.id_nomina} value={n.id_nomina}>Nómina #{n.id_nomina} - Empl {n.id_empleado}</option>
                ))}
              </select>
              {formErrors.id_nomina && <div className="field-error">{formErrors.id_nomina}</div>}
            </div>
            <div className="form-grupo">
              <label>Motivo</label>
              <input name="motivo" value={form.motivo || ''} onChange={handleChange} />
              {formErrors.motivo && <div className="field-error">{formErrors.motivo}</div>}
            </div>
            <div className="form-grupo">
              <label>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange}>
                <option value="devengo">Devengo</option>
                <option value="deduccion">Deducción</option>
              </select>
              {formErrors.tipo && <div className="field-error">{formErrors.tipo}</div>}
            </div>
            <div className="form-grupo">
              <label>Monto</label>
              <input name="monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleChange} onKeyDown={numericKeyDown} />
              {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
            </div>
            <div className="form-botones">
              <button className="btn-guardar" onClick={handleCreate}>Guardar</button>
              <button className="btn-cancelar" onClick={() => setCreateModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Rubros;