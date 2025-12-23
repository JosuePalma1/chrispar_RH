import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Rubros.css';
import { FaFilePdf, FaFileExcel, FaPlus, FaTimes } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Rubros() {
  const [rubros, setRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nominasList, setNominasList] = useState([]);
  const [search, setSearch] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id_rubro: null, id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchRubros();
  }, []);

  useEffect(() => {
    fetchNominasList();
  }, []);

  const handleSearch = (e) => setSearch(e.target.value);

  const filteredRubros = Array.isArray(rubros) && search.trim()
    ? rubros.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase())))
    : rubros;

  const fetchRubros = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/rubros/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRubros(res.data);
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Prevent non-numeric characters in numeric inputs (block letters like 'e' etc.)
  const numericKeyDown = (e) => {
    const allowedKeys = [
      'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End',
      '.', // decimal point
    ];
    if (allowedKeys.includes(e.key)) return;
    // Allow Ctrl/Cmd combos
    if (e.ctrlKey || e.metaKey) return;
    // Allow digits
    if (/^[0-9]$/.test(e.key)) return;
    // Prevent everything else
    e.preventDefault();
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
    // Código: alfanumérico, guiones y guión bajo, 1-50 chars
    if (!form.codigo || form.codigo.trim() === '') {
      errors.codigo = 'Código requerido';
    } else if (!/^[A-Za-z0-9_\-]{1,50}$/.test(String(form.codigo).trim())) {
      errors.codigo = 'Código inválido (solo letras, números, _ o -)';
    }
    // Descripción
    if (!form.descripcion || form.descripcion.trim() === '') {
      errors.descripcion = 'Descripción requerida';
    } else if (String(form.descripcion).trim().length > 255) {
      errors.descripcion = 'Descripción demasiado larga (máx 255 caracteres)';
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
        codigo: String(form.codigo).trim(),
        descripcion: String(form.descripcion).trim(),
        tipo: form.tipo,
        monto: parseFloat(form.monto) || 0,
        creado_por: 1
      };
      await axios.post(`${API_URL}/api/rubros/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Rubro creado exitosamente');
      setForm({ id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
      setCreateModalOpen(false);
      fetchRubros();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear rubro');
      alert(err.response?.data?.error || 'Error al crear rubro');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este rubro?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/rubros/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRubros();
    } catch (err) {
      setError('Error al eliminar rubro');
    }
  };

  const openEditModal = (rubro) => {
    setEditForm({
      id_rubro: rubro.id_rubro,
      id_nomina: rubro.id_nomina,
      codigo: rubro.codigo || '',
      descripcion: rubro.descripcion || '',
      tipo: rubro.tipo || 'devengo',
      monto: rubro.monto || 0
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const validateEdit = () => {
    const errors = {};
    if (!editForm.codigo || editForm.codigo.trim() === '') errors.codigo = 'Código requerido';
    else if (!/^[A-Za-z0-9_\-]{1,50}$/.test(String(editForm.codigo).trim())) errors.codigo = 'Código inválido (solo letras, números, _ o -)';
    if (!editForm.descripcion || editForm.descripcion.trim() === '') errors.descripcion = 'Descripción requerida';
    else if (String(editForm.descripcion).trim().length > 255) errors.descripcion = 'Descripción demasiado larga (máx 255 caracteres)';
    if (!['devengo', 'deduccion'].includes(editForm.tipo)) errors.tipo = 'Tipo inválido';
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
        codigo: editForm.codigo,
        descripcion: editForm.descripcion,
        tipo: editForm.tipo,
        monto: parseFloat(editForm.monto) || 0
      };
      await axios.put(`${API_URL}/api/rubros/${editForm.id_rubro}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEditModalOpen(false);
      fetchRubros();
      alert('Rubro actualizado correctamente');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar rubro');
      alert(err.response?.data?.error || 'Error al actualizar rubro');
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="rubros-container">
        <div className="rubros-header">
          <h2>Rubros de Pago</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" title="Exportar PDF"><FaFilePdf /> PDF</button>
            <button className="btn-exportar btn-excel" title="Exportar Excel"><FaFileExcel /> Excel</button>
            <button className="btn-nuevo" onClick={() => { setCreateModalOpen(true); setForm({ id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' }); setFormErrors({}); }} title="Crear Rubro"><FaPlus /></button>
          </div>
        </div>

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
              <th>ID</th>
              <th>Nómina</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRubros.map(r => (
              <tr key={r.id_rubro}>
                <td className="td-center">{r.id_rubro}</td>
                <td className="td-center">{r.id_nomina}</td>
                <td className="td-center">{r.codigo}</td>
                <td className="td-center">{r.descripcion}</td>
                <td className="td-center">{r.tipo}</td>
                <td className="td-center">{r.monto}</td>
                <td className="td-center">
                  <div className="acciones-grupo">
                    <button className="btn-update" onClick={() => openEditModal(r)}>Actualizar</button>
                    <button className="btn-delete" onClick={() => handleDelete(r.id_rubro)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
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
              <label>Código</label>
              <input name="codigo" value={editForm.codigo} onChange={handleEditChange} />
              {formErrors.codigo && <div className="field-error">{formErrors.codigo}</div>}
            </div>
            <div className="form-grupo">
              <label>Descripción</label>
              <input name="descripcion" value={editForm.descripcion} onChange={handleEditChange} />
              {formErrors.descripcion && <div className="field-error">{formErrors.descripcion}</div>}
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
              <input name="monto" type="number" step="0.01" min="0" value={editForm.monto} onChange={handleEditChange} onKeyDown={numericKeyDown} />
              {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
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
              <h3>Crear Rubro</h3>
              <button className="btn-cerrar-modal" onClick={() => setCreateModalOpen(false)} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <label>Nómina</label>
              <select name="id_nomina" value={form.id_nomina} onChange={handleChange}>
                <option value="">-- Seleccionar nómina --</option>
                {nominasList.map(n => (
                  <option key={n.id_nomina} value={n.id_nomina}>Nómina #{n.id_nomina} - Empl {n.id_empleado} ({n.fecha_inicio} / {n.fecha_fin})</option>
                ))}
              </select>
              {formErrors.id_nomina && <div className="field-error">{formErrors.id_nomina}</div>}
            </div>
            <div className="form-grupo">
              <label>Código</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} />
              {formErrors.codigo && <div className="field-error">{formErrors.codigo}</div>}
            </div>
            <div className="form-grupo">
              <label>Descripción</label>
              <input name="descripcion" value={form.descripcion} onChange={handleChange} />
              {formErrors.descripcion && <div className="field-error">{formErrors.descripcion}</div>}
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
