import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import './Permisos.css';
import { FaCheck, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Permisos() {
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [form, setForm] = useState({ id_empleado: '', fecha_inicio: '', fecha_fin: '', tipo: '', motivo: '' });
  const [empleados, setEmpleados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const decodeToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return {};
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload;
    } catch (e) {
      return {};
    }
  }
  useEffect(() => {
    fetchPermisos();
    fetchEmpleados();
  }, []);

  const formatDate = (val) => {
    if (!val && val !== 0) return '';
    try {
      if (typeof val === 'string') {
        if (val.includes('T')) return val.split('T')[0];
        if (val.length >= 10) return val.slice(0, 10);
        return val;
      }
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      return String(val).slice(0, 10);
    } catch (e) {
      return String(val);
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '';
    try {
      // Parse ISO into Date and display in LOCAL time with seconds: YYYY-MM-DD HH:MM:SS
      // If the backend returned a naive ISO string (no timezone), treat it as UTC
      let s = String(iso);
      // Normalize space separator to 'T'
      if (s.indexOf('T') === -1 && s.indexOf(' ') !== -1) s = s.replace(' ', 'T');
      // If no timezone info (no 'Z' or +/-TZ), assume UTC and append 'Z'
      if (!s.match(/Z$|[\+\-]\d{2}:?\d{2}$/)) s = s + 'Z';
      const d = new Date(s);
      if (isNaN(d.getTime())) {
        // fallback: try slicing
        const s = String(iso);
        return s.replace('T', ' ').slice(0, 19);
      }
      const pad = (n) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      const seconds = pad(d.getSeconds());
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return String(iso);
    }
  };

  const splitDateTime = (iso) => {
    const s = formatDateTime(iso);
    if (!s) return { d: '', t: '' };
    const parts = s.split(' ');
    return { d: parts[0] || '', t: parts[1] || '' };
  };

  const fetchEmpleados = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/empleados/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setEmpleados(data);
    } catch (err) {
      console.error('Error fetching empleados', err);
      setEmpleados([]);
    }
  };

  const fetchPermisos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/permisos/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPermisos(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) setError('Sesión expirada. Por favor inicie sesión.');
      else setError('Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast(mensaje);
    setToastType(tipo);
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Validación básica de fechas requeridas por el backend
      if (!form.fecha_inicio || !form.fecha_fin) {
        mostrarToast('Fecha inicio y fecha fin son requeridas', 'error');
        return;
      }

      if (!form.id_empleado) {
        mostrarToast('Debe seleccionar un empleado', 'error');
        return;
      }

      if (!form.tipo) {
        mostrarToast('Debe seleccionar el tipo de permiso', 'error');
        return;
      }

      if (!form.motivo || !form.motivo.trim()) {
        mostrarToast('El motivo es requerido', 'error');
        return;
      }

      // Validar que fecha_fin >= fecha_inicio
      const inicio = new Date(form.fecha_inicio);
      const fin = new Date(form.fecha_fin);
      if (fin < inicio) {
        mostrarToast('La fecha fin no puede ser anterior a la fecha inicio', 'error');
        return;
      }

      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        tipo: form.tipo,
        descripcion: form.motivo
      };

      const decoded = decodeToken();
      if (editingId) {
        // editing: include modificado_por
        if (decoded && decoded.id) payload.modificado_por = decoded.id;
        await axios.put(`${API_URL}/api/permisos/${editingId}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
        setEditingId(null);
        mostrarToast('Permiso actualizado exitosamente', 'success');
      } else {
        if (decoded && decoded.id) payload.creado_por = decoded.id;
        await axios.post(`${API_URL}/api/permisos/`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
        mostrarToast('Permiso creado exitosamente', 'success');
      }

      setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', tipo: '', motivo: '' });
      setMostrarModal(false);
      fetchPermisos();
    } catch (err) {
      console.error(err);
      mostrarToast(err.response?.data?.error || 'Error al crear permiso', 'error');
    }
  };

  const handleChangeEstado = async (id, nuevoEstado) => {
    // Prepare payload and snapshot before performing optimistic update
    const token = localStorage.getItem('token');
    const decoded = decodeToken();
    const payload = { estado: nuevoEstado };
    if (decoded && decoded.username) payload.autorizado_por = decoded.username;
    if (decoded && decoded.id) payload.modificado_por = decoded.id;

    const previous = permisos;
    const now = new Date().toISOString();

    // Optimistic update: update row in place so UI reflects change immediately
    setUpdatingId(id);
    setPermisos(prev => prev.map(p => (p.id_permiso === id ? { ...p, estado: nuevoEstado, autorizado_por: payload.autorizado_por || p.autorizado_por, fecha_actualizacion: now } : p)));

    try {
      const res = await axios.put(`${API_URL}/api/permisos/${id}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      // If server returns updated object, merge it into the existing row
      if (res && res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
        const updated = { ...res.data };
        if (!updated.id_permiso && updated.id) updated.id_permiso = updated.id;
        setPermisos(prev => prev.map(p => (p.id_permiso === id ? { ...p, ...updated } : p)));
      }
    } catch (err) {
      // revert on error
      console.error('handleChangeEstado error:', err);
      setPermisos(previous);
      const msg = err.response?.data?.error || err.response?.data || err.message || 'Error al cambiar estado';
      mostrarToast(String(msg), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    // replaced by confirm modal flow: this function kept for direct delete when confirmed
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/permisos/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchPermisos();
      mostrarToast('Permiso eliminado', 'success');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al eliminar permiso', 'error');
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('¿Eliminar este registro?');

  const openConfirm = (id, message) => {
    setConfirmTargetId(id);
    setConfirmMessage(message || '¿Eliminar este registro?');
    setShowConfirm(true);
  };

  const onConfirmDelete = async () => {
    if (!confirmTargetId) { setShowConfirm(false); return; }
    await handleDelete(confirmTargetId);
    setConfirmTargetId(null);
    setShowConfirm(false);
  };

  // client-side search + pagination
  const filtered = permisos.filter(p => {
    const emp = empleados.find(e => e.id === p.id_empleado);
    const nombreEmp = emp ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() : String(p.id_empleado);
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    return nombreEmp.toLowerCase().includes(q) || (p.tipo || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q) || (formatDate(p.fecha_inicio) || '').includes(q) || (formatDate(p.fecha_fin) || '').includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="permisos-container main-with-sidebar">
        <div className="header-card">
          <div className="permisos-header">
            <h2>Gestión de permisos</h2>
            <div className="header-right">
              <button className="btn-add" onClick={() => setMostrarModal(true)} aria-label="Nuevo Permiso">+</button>
            </div>
          </div>
        </div>

        <div className="search-card">
          <div className="busqueda-wrapper">
            <input className="input-busqueda" placeholder="Buscar por empleado, tipo, motivo, fecha..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="resultados-info">Mostrando <strong>{paginated.length}</strong> de <strong>{filtered.length}</strong> registros</div>
        </div>

        {mostrarModal && (
          <div className="modal">
            <div className="modal-contenido">
              <h3>{editingId ? 'Editar Permiso' : 'Nuevo Permiso'}</h3>
              <form onSubmit={async (e) => { await handleCreate(e); setMostrarModal(false); }}>
                <div className="form-grupo">
                  <label>Empleado:</label>
                  <select name="id_empleado" value={form.id_empleado} onChange={handleChange} required>
                    <option value="">-- Seleccione empleado --</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{`${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || `#${emp.id}`}</option>
                    ))}
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Fecha inicio:</label>
                  <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} required />
                </div>

                <div className="form-grupo">
                  <label>Fecha fin:</label>
                  <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} required />
                </div>

                <div className="form-grupo">
                  <label>Tipo:</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} required>
                    <option value="">-- Seleccione tipo --</option>
                    <option value="permiso">Permiso</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="licencia">Licencia</option>
                  </select>
                </div>

                <div className="form-grupo">
                  <label>Motivo:</label>
                  <textarea name="motivo" placeholder="Motivo" value={form.motivo} onChange={handleChange} required />
                </div>

                <div className="form-botones">
                  <button type="submit" className="btn-guardar">{editingId ? 'Guardar' : 'Crear'}</button>
                  <button type="button" className="btn-cancelar" onClick={() => { setMostrarModal(false); setEditingId(null); }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? <p>Cargando permisos...</p> : error ? <p className="error">{error}</p> : (
          <>
          <div className="table-wrapper">
          <table className="permisos-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Autorizado Por</th>
                <th>Creado</th>
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length ? paginated.map(p => {
                const emp = empleados.find(e => e.id === p.id_empleado);
                const nombreEmp = emp ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() : p.id_empleado;
                return (
                  <tr key={p.id_permiso}>
                    <td className="col-emp">{nombreEmp}</td>
                    <td className="col-date">{formatDate(p.fecha_inicio)}</td>
                    <td className="col-date">{formatDate(p.fecha_fin)}</td>
                    <td className="col-type">{p.tipo}</td>
                    <td className="col-desc">{p.descripcion}</td>
                    <td className="col-state"><span className={`estado ${p.estado}`}>{p.estado === 'pendiente' ? 'En espera' : (p.estado === 'rechazado' ? 'Desaprobado' : (p.estado === 'aprobado' ? 'Aprobado' : p.estado))}</span></td>
                    <td className="col-auth">{p.autorizado_por}</td>
                    <td className="col-created">{
                      (() => {
                        const s = splitDateTime(p.fecha_creacion);
                        if (!s.t || s.t === '00:00:00') return s.d;
                        return (<div className="datetime"><div className="d">{s.d}</div><div className="t">{s.t}</div></div>);
                      })()
                    }</td>
                    <td className="col-updated">{
                      (() => {
                        const s2 = splitDateTime(p.fecha_actualizacion);
                        if (!s2.t || s2.t === '00:00:00') return s2.d;
                        return (<div className="datetime"><div className="d">{s2.d}</div><div className="t">{s2.t}</div></div>);
                      })()
                    }</td>
                    <td className="col-actions">
                      <div className="action-vertical">
                        <button className="icon-btn approve" title="Aprobar" aria-label="Aprobar" onClick={() => handleChangeEstado(p.id_permiso, 'aprobado')}><FaCheck /></button>
                        <button className="icon-btn reject" title="Desaprobar" aria-label="Desaprobar" onClick={() => handleChangeEstado(p.id_permiso, 'rechazado')}><FaTimes /></button>
                        <button className="icon-btn edit" title="Editar" aria-label="Editar" onClick={() => {
                          setEditingId(p.id_permiso);
                          setForm({ id_empleado: p.id_empleado ? String(p.id_empleado) : '', fecha_inicio: formatDate(p.fecha_inicio), fecha_fin: formatDate(p.fecha_fin), tipo: p.tipo || '', motivo: p.descripcion || '' });
                          setMostrarModal(true);
                        }}><FaEdit /></button>
                        <button className="icon-btn delete" title="Eliminar" aria-label="Eliminar" onClick={() => openConfirm(p.id_permiso, '¿Eliminar este permiso?')}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="10">No hay permisos registrados.</td></tr>
              )}
            </tbody>
          </table>
          </div>
          <div className="footer-card">
            <div className="table-footer">
              <div className="pagination-controls">
                <button className="btn-prev" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
                <button className="page-number" disabled>{currentPage}</button>
                {totalPages > currentPage && (
                  <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>{currentPage + 1}</button>
                )}
                <button className="btn-next" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</button>
              </div>
              <div className="page-size">
                <label>Mostrar:</label>
                <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value,10)); setCurrentPage(1); }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span> registros</span>
              </div>
            </div>
          </div>
          </>
        )}
        </div>
        {toast && (
          <div className={`app-toast toast-${toastType}`}>
            {toast}
          </div>
        )}
        <ConfirmModal isOpen={showConfirm} title="Confirmar eliminación" message={confirmMessage} onConfirm={onConfirmDelete} onCancel={() => setShowConfirm(false)} />
      </div>
  );
}

export default Permisos;
