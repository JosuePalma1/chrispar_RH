import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Rubros.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Rubros() {
  const [rubros, setRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id_rubro: null, id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchRubros();
  }, []);

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
    e.preventDefault();
    // Validaciones
    const errors = {};
    if (!form.id_nomina || isNaN(parseInt(form.id_nomina, 10)) || parseInt(form.id_nomina, 10) <= 0) errors.id_nomina = 'ID de nómina inválido';
    if (!form.codigo || form.codigo.trim() === '') errors.codigo = 'Código requerido';
    if (!form.descripcion || form.descripcion.trim() === '') errors.descripcion = 'Descripción requerida';
    if (!['devengo', 'deduccion'].includes(form.tipo)) errors.tipo = 'Tipo inválido';
    if (form.monto === '' || isNaN(parseFloat(form.monto)) || parseFloat(form.monto) < 0) errors.monto = 'Monto inválido';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        id_nomina: parseInt(form.id_nomina, 10),
        codigo: form.codigo,
        descripcion: form.descripcion,
        tipo: form.tipo,
        monto: parseFloat(form.monto) || 0,
        creado_por: 1
      };
      const response = await axios.post(`${API_URL}/api/rubros/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Rubro creado exitosamente');
      setForm({ id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
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
    if (!editForm.descripcion || editForm.descripcion.trim() === '') errors.descripcion = 'Descripción requerida';
    if (!['devengo', 'deduccion'].includes(editForm.tipo)) errors.tipo = 'Tipo inválido';
    if (editForm.monto === '' || isNaN(parseFloat(editForm.monto)) || parseFloat(editForm.monto) < 0) errors.monto = 'Monto inválido';
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
        <h2 className="title">Rubros</h2>

        <form className="rubro-form" onSubmit={handleCreate}>
        <div>
          <input name="id_nomina" placeholder="ID Nómina" value={form.id_nomina} onChange={handleChange} required />
          {formErrors.id_nomina && <div className="field-error">{formErrors.id_nomina}</div>}
        </div>
        <div>
          <input name="codigo" placeholder="Código" value={form.codigo} onChange={handleChange} required />
          {formErrors.codigo && <div className="field-error">{formErrors.codigo}</div>}
        </div>
        <div>
          <input name="descripcion" placeholder="Descripción" value={form.descripcion} onChange={handleChange} required />
          {formErrors.descripcion && <div className="field-error">{formErrors.descripcion}</div>}
        </div>
        <div>
          <select name="tipo" value={form.tipo} onChange={handleChange} required>
            <option value="devengo">Devengo</option>
            <option value="deduccion">Deducción</option>
          </select>
          {formErrors.tipo && <div className="field-error">{formErrors.tipo}</div>}
        </div>
        <div>
          <input name="monto" placeholder="Monto" type="number" step="0.01" min="0" value={form.monto} onChange={handleChange} onKeyDown={numericKeyDown} required />
          {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
        </div>
        <button className="btn-create" type="submit">Crear Rubro</button>
      </form>

      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <table className="rubros-table">
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
            {rubros.map(r => (
              <tr key={r.id_rubro}>
                <td>{r.id_rubro}</td>
                <td>{r.id_nomina}</td>
                <td>{r.codigo}</td>
                <td>{r.descripcion}</td>
                <td>{r.tipo}</td>
                <td>{r.monto}</td>
                <td>
                  <button className="btn-update" onClick={() => openEditModal(r)}>Actualizar</button>
                  <button className="btn-delete" onClick={() => handleDelete(r.id_rubro)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Edit Modal */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Rubro #{editForm.id_rubro}</h3>
            <div className="modal-row">
              <label>Código</label>
              <input name="codigo" value={editForm.codigo} onChange={handleEditChange} />
              {formErrors.codigo && <div className="field-error">{formErrors.codigo}</div>}
            </div>
            <div className="modal-row">
              <label>Descripción</label>
              <input name="descripcion" value={editForm.descripcion} onChange={handleEditChange} />
              {formErrors.descripcion && <div className="field-error">{formErrors.descripcion}</div>}
            </div>
            <div className="modal-row">
              <label>Tipo</label>
              <select name="tipo" value={editForm.tipo} onChange={handleEditChange}>
                <option value="devengo">Devengo</option>
                <option value="deduccion">Deducción</option>
              </select>
              {formErrors.tipo && <div className="field-error">{formErrors.tipo}</div>}
            </div>
            <div className="modal-row">
              <label>Monto</label>
              <input name="monto" type="number" step="0.01" min="0" value={editForm.monto} onChange={handleEditChange} onKeyDown={numericKeyDown} />
              {formErrors.monto && <div className="field-error">{formErrors.monto}</div>}
            </div>
            <div className="modal-actions">
              <button className="btn-update" onClick={handleEditSave}>Guardar</button>
              <button className="btn-delete" onClick={() => setEditModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Rubros;
