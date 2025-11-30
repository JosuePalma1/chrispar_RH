import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Nominas.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Nominas() {
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id_nomina: null, id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '', estado: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchNominas();
  }, []);

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    // Validaciones
    const errors = {};
    if (!form.id_empleado || isNaN(parseInt(form.id_empleado, 10)) || parseInt(form.id_empleado, 10) <= 0) errors.id_empleado = 'ID de empleado inválido';
    if (!form.fecha_inicio) errors.fecha_inicio = 'Fecha inicio requerida';
    if (!form.fecha_fin) errors.fecha_fin = 'Fecha fin requerida';
    if (form.fecha_inicio && form.fecha_fin && new Date(form.fecha_inicio) > new Date(form.fecha_fin)) errors.fecha_fin = 'Fecha fin debe ser posterior o igual a fecha inicio';
    if (form.total === '' || isNaN(parseFloat(form.total)) || parseFloat(form.total) < 0) errors.total = 'Total inválido';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        total: parseFloat(form.total) || 0,
        creado_por: 1
      };
      const response = await axios.post(`${API_URL}/api/nominas/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Nómina creada exitosamente');
      setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
      fetchNominas();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear nómina');
      alert(err.response?.data?.error || 'Error al crear nómina');
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
      total: nomina.total || 0,
      estado: nomina.estado || ''
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const validateEdit = () => {
    const errors = {};
    if (!editForm.fecha_inicio) errors.fecha_inicio = 'Fecha inicio requerida';
    if (!editForm.fecha_fin) errors.fecha_fin = 'Fecha fin requerida';
    if (editForm.fecha_inicio && editForm.fecha_fin && new Date(editForm.fecha_inicio) > new Date(editForm.fecha_fin)) errors.fecha_fin = 'Fecha fin debe ser posterior o igual a fecha inicio';
    if (editForm.total === '' || isNaN(parseFloat(editForm.total)) || parseFloat(editForm.total) < 0) errors.total = 'Total inválido';
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
        total: parseFloat(editForm.total) || 0,
        estado: editForm.estado
      };
      await axios.put(`${API_URL}/api/nominas/${editForm.id_nomina}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEditModalOpen(false);
      fetchNominas();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar nómina');
      alert(err.response?.data?.error || 'Error al actualizar nómina');
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="nominas-container">
        <h2 className="title">Nóminas</h2>

        <form className="nomina-form" onSubmit={handleCreate}>
        <div>
          <input name="id_empleado" placeholder="ID Empleado" value={form.id_empleado} onChange={handleChange} required />
          {formErrors.id_empleado && <div className="field-error">{formErrors.id_empleado}</div>}
        </div>
        <div>
          <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} required />
          {formErrors.fecha_inicio && <div className="field-error">{formErrors.fecha_inicio}</div>}
        </div>
        <div>
          <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} required />
          {formErrors.fecha_fin && <div className="field-error">{formErrors.fecha_fin}</div>}
        </div>
        <div>
          <input name="total" placeholder="Total" value={form.total} onChange={handleChange} required />
          {formErrors.total && <div className="field-error">{formErrors.total}</div>}
        </div>
        <button className="btn-create" type="submit">Crear Nómina</button>
      </form>

      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <table className="nominas-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Empleado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {nominas.map(n => (
              <tr key={n.id_nomina}>
                <td>{n.id_nomina}</td>
                <td>{n.id_empleado}</td>
                <td>{n.fecha_inicio}</td>
                <td>{n.fecha_fin}</td>
                <td>{n.total}</td>
                <td>
                  <button className="btn-update" onClick={() => openEditModal(n)}>Actualizar</button>
                  <button className="btn-delete" onClick={() => handleDelete(n.id_nomina)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar Nómina #{editForm.id_nomina}</h3>
            <div className="modal-row">
              <label>Fecha Inicio</label>
              <input name="fecha_inicio" type="date" value={editForm.fecha_inicio} onChange={handleEditChange} />
              {formErrors.fecha_inicio && <div className="field-error">{formErrors.fecha_inicio}</div>}
            </div>
            <div className="modal-row">
              <label>Fecha Fin</label>
              <input name="fecha_fin" type="date" value={editForm.fecha_fin} onChange={handleEditChange} />
              {formErrors.fecha_fin && <div className="field-error">{formErrors.fecha_fin}</div>}
            </div>
            <div className="modal-row">
              <label>Total</label>
              <input name="total" value={editForm.total} onChange={handleEditChange} />
              {formErrors.total && <div className="field-error">{formErrors.total}</div>}
            </div>
            <div className="modal-row">
              <label>Estado</label>
              <input name="estado" value={editForm.estado} onChange={handleEditChange} />
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

export default Nominas;
