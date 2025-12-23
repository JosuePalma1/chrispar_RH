import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Nominas.css';
import { FaFilePdf, FaFileExcel, FaPlus, FaTimes } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Nominas() {
  const [nominas, setNominas] = useState([]);
  const [empleadosList, setEmpleadosList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id_nomina: null, id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
  const [formErrors, setFormErrors] = useState({});

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

  const handleCreate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // Validaciones completas
    const errors = {};
    // Empleado seleccionado y válido
    if (!form.id_empleado) {
      errors.id_empleado = 'Selecciona un empleado';
    } else if (!empleadosList.find(emp => String(emp.id) === String(form.id_empleado))) {
      errors.id_empleado = 'Empleado no válido';
    }
    // Fechas
    const fechaInicioVal = form.fecha_inicio ? Date.parse(form.fecha_inicio) : NaN;
    const fechaFinVal = form.fecha_fin ? Date.parse(form.fecha_fin) : NaN;
    if (!form.fecha_inicio || isNaN(fechaInicioVal)) errors.fecha_inicio = 'Fecha inicio inválida';
    if (!form.fecha_fin || isNaN(fechaFinVal)) errors.fecha_fin = 'Fecha fin inválida';
    if (!errors.fecha_inicio && !errors.fecha_fin && fechaInicioVal > fechaFinVal) errors.fecha_fin = 'Fecha fin debe ser posterior o igual a fecha inicio';
    // Total
    if (form.total === '' || form.total === null || typeof form.total === 'undefined') {
      errors.total = 'Total requerido';
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(String(form.total))) {
      errors.total = 'Total debe ser numérico con hasta 2 decimales';
    } else if (parseFloat(form.total) < 0) {
      errors.total = 'Total no puede ser negativo';
    } else if (parseFloat(form.total) > 1000000000) {
      errors.total = 'Total demasiado grande';
    }
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
      await axios.post(`${API_URL}/api/nominas/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert('Nómina creada exitosamente');
      setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
      setCreateModalOpen(false);
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

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="nominas-container">
        <div className="nominas-header">
          <h2>Gestión de Nóminas</h2>
          <div className="header-actions">
            <button className="btn-exportar btn-pdf" title="Exportar PDF"><FaFilePdf /> PDF</button>
            <button className="btn-exportar btn-excel" title="Exportar Excel"><FaFileExcel /> Excel</button>
            <button className="btn-nuevo" onClick={() => { setCreateModalOpen(true); setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' }); setFormErrors({}); }} title="Crear Nómina"><FaPlus /></button>
          </div>
        </div>

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
              <th>ID</th>
              <th>Empleado</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredNominas.map(n => (
              <tr key={n.id_nomina}>
                <td className="td-center">{n.id_nomina}</td>
                <td className="td-center">{n.id_empleado}</td>
                <td className="td-center">{n.fecha_inicio}</td>
                <td className="td-center">{n.fecha_fin}</td>
                <td className="td-center">{n.total}</td>
                <td className="td-center">
                  <div className="acciones-grupo">
                    <button className="btn-update" onClick={() => openEditModal(n)}>Actualizar</button>
                    <button className="btn-delete" onClick={() => handleDelete(n.id_nomina)}>Eliminar</button>
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
              <button className="btn-cerrar-modal" onClick={() => setCreateModalOpen(false)} type="button"><FaTimes /></button>
            </div>
            <div className="form-grupo">
              <label>Empleado</label>
              <select name="id_empleado" value={form.id_empleado} onChange={handleChange}>
                <option value="">-- Seleccionar empleado --</option>
                {empleadosList.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombres} {emp.apellidos} (#{emp.id})</option>
                ))}
              </select>
              {formErrors.id_empleado && <div className="field-error">{formErrors.id_empleado}</div>}
            </div>
            <div className="form-grupo">
              <label>Fecha Inicio</label>
              <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} />
              {formErrors.fecha_inicio && <div className="field-error">{formErrors.fecha_inicio}</div>}
            </div>
            <div className="form-grupo">
              <label>Fecha Fin</label>
              <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} />
              {formErrors.fecha_fin && <div className="field-error">{formErrors.fecha_fin}</div>}
            </div>
            <div className="form-grupo">
              <label>Total</label>
              <input name="total" type="number" step="0.01" min="0" value={form.total} onChange={handleChange} onKeyDown={numericKeyDown} />
              {formErrors.total && <div className="field-error">{formErrors.total}</div>}
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

export default Nominas;
