import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import ConfirmModal from './ConfirmModal';
import './Asistencias.css';
import { FaEdit, FaTrash } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Asistencias() {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [form, setForm] = useState({ id_empleado: '', fecha: '', hora_entrada: '', hora_salida: '' });
  const [empleados, setEmpleados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAsistencias();
    fetchEmpleados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/empleados/`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setEmpleados(data);
    } catch (err) {
      console.error('Error fetching empleados', err);
      setEmpleados([]);
    }
  };
  const fetchAsistencias = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/asistencias/`, { headers: { 'Authorization': `Bearer ${token}` } });
      setAsistencias(Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []));
      setError('');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) setError('Sesión expirada. Por favor inicie sesión.');
      else setError('Error al cargar asistencias');
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
      if (!form.id_empleado) { mostrarToast('Seleccione un empleado', 'error'); return; }
      if (!form.fecha) { mostrarToast('Seleccione la fecha', 'error'); return; }
      if (!form.hora_entrada) { mostrarToast('Ingrese la hora de entrada', 'error'); return; }
      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        fecha: form.fecha || null,
        hora_entrada: form.hora_entrada || null,
        hora_salida: form.hora_salida || null
      };

      if (editingId) {
        // Edit existing
        // attach modificado_por from token if available
        try {
          const decoded = (() => {
            const tokenParts = token ? token.split('.') : [];
            if (tokenParts.length < 2) return {};
            try {
              return JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
            } catch (e) { return {}; }
          })();
          if (decoded && (decoded.user_id || decoded.id)) payload.modificado_por = decoded.user_id || decoded.id;
        } catch (e) {}

        await axios.put(`${API_URL}/api/asistencias/${editingId}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
        setEditingId(null);
      } else {
        await axios.post(`${API_URL}/api/asistencias/`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      }

      setForm({ id_empleado: '', fecha: '', hora_entrada: '', hora_salida: '' });
      setMostrarModal(false);
      fetchAsistencias();
      mostrarToast(editingId ? 'Asistencia actualizada' : 'Asistencia creada', 'success');
    } catch (err) {
      console.error(err);
      mostrarToast(err.response?.data?.error || 'Error al crear asistencia', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/asistencias/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchAsistencias();
      mostrarToast('Asistencia eliminada', 'success');
    } catch (err) {
      console.error(err);
      mostrarToast('Error al eliminar asistencia', 'error');
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

  const formatDateTime = (iso) => {
    if (!iso) return '';
    try {
      // Parse ISO into Date and display in LOCAL time with seconds: YYYY-MM-DD HH:MM:SS
      // If the backend returned a naive ISO string (no timezone), treat it as UTC
      let s = String(iso);
      if (s.indexOf('T') === -1 && s.indexOf(' ') !== -1) s = s.replace(' ', 'T');
      if (!s.match(/Z$|[\+\-]\d{2}:?\d{2}$/)) s = s + 'Z';
      const d = new Date(s);
      if (isNaN(d.getTime())) {
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

  // client-side search + pagination helpers
  const filtered = asistencias.filter(a => {
    const emp = empleados.find(e => e.id === a.id_empleado);
    const nombreEmp = emp ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() : String(a.id_empleado);
    const fechaStr = a.fecha || '';
    const entrada = a.hora_entrada || '';
    const salida = a.hora_salida || '';
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    return nombreEmp.toLowerCase().includes(q) || fechaStr.includes(q) || entrada.includes(q) || salida.includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="asistencias-container main-with-sidebar">
        <div className="header-card">
          <div className="asistencias-header">
            <h2>Gestión de Asistencias</h2>
            <div className="header-right">
              <button className="btn-add" onClick={() => setMostrarModal(true)} aria-label="Nueva Asistencia">+</button>
            </div>
          </div>
        </div>

        <div className="search-card">
          <div className="busqueda-wrapper">
            <input className="input-busqueda" placeholder="Buscar por empleado, fecha, ..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="resultados-info">Mostrando <strong>{paginated.length}</strong> de <strong>{filtered.length}</strong> registros</div>
        </div>

        {mostrarModal && (
          <div className="modal">
            <div className="modal-contenido">
              <h3>Nueva Asistencia</h3>
              <form onSubmit={handleCreate}>
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
                  <label>Fecha:</label>
                  <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required />
                </div>

                <div className="form-grupo">
                  <label>Hora entrada:</label>
                  <input name="hora_entrada" type="time" value={form.hora_entrada} onChange={handleChange} required />
                </div>

                <div className="form-grupo">
                  <label>Hora salida:</label>
                  <input name="hora_salida" type="time" value={form.hora_salida} onChange={handleChange} />
                </div>

                <div className="form-botones">
                  <button type="submit" className="btn-guardar">Crear</button>
                  <button type="button" className="btn-cancelar" onClick={() => setMostrarModal(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

                {loading ? <p>Cargando asistencias...</p> : error ? <p className="error">{error}</p> : (
            <>
              <div className="table-wrapper">
              <table className="asistencias-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas Extra</th>
                <th>Registrado Por</th>
                <th>Creado</th>
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length ? paginated.map(a => {
                const emp = empleados.find(e => e.id === a.id_empleado);
                const nombreEmp = emp ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() : a.id_empleado;
                return (
                  <tr key={a.id_asistencia}>
                    <td className="col-emp">{nombreEmp}</td>
                    <td className="col-date">{a.fecha}</td>
                    <td className="col-time">{a.hora_entrada}</td>
                    <td className="col-time">{a.hora_salida}</td>
                    <td className="col-extra">{a.horas_extra != null ? a.horas_extra : 0}</td>
                    <td className="col-user">{a.creado_por_username || a.creado_por || 'N/A'}</td>
                    <td className="col-created">{
                      (() => {
                        const s = splitDateTime(a.fecha_creacion);
                        if (!s.t || s.t === '00:00:00') return s.d;
                        return (<div className="datetime"><div className="d">{s.d}</div><div className="t">{s.t}</div></div>);
                      })()
                    }</td>
                    <td className="col-updated">{
                      (() => {
                        const s2 = splitDateTime(a.fecha_actualizacion);
                        if (!s2.t || s2.t === '00:00:00') return s2.d;
                        return (<div className="datetime"><div className="d">{s2.d}</div><div className="t">{s2.t}</div></div>);
                      })()
                    }</td>
                    <td className="col-actions">
                      <div className="action-vertical">
                        <button className="icon-btn edit" onClick={() => {
                          setEditingId(a.id_asistencia);
                          setForm({ id_empleado: a.id_empleado.toString(), fecha: a.fecha, hora_entrada: a.hora_entrada, hora_salida: a.hora_salida || '' });
                          setMostrarModal(true);
                        }} aria-label="Editar"><FaEdit /></button>
                        <button className="icon-btn delete" onClick={() => openConfirm(a.id_asistencia, '¿Eliminar esta asistencia?')} aria-label="Eliminar"><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="9">No hay asistencias registradas.</td></tr>
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

export default Asistencias;
