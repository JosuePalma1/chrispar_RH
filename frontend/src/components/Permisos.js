import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Permisos.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Permisos() {
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', fecha_inicio: '', fecha_fin: '', tipo: '', motivo: '' });
  const [empleados, setEmpleados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

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
  };

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Validación básica de fechas requeridas por el backend
      if (!form.fecha_inicio || !form.fecha_fin) {
        alert('Fecha inicio y fecha fin son requeridas');
        return;
      }

      if (!form.id_empleado) {
        alert('Debe seleccionar un empleado');
        return;
      }

      if (!form.tipo) {
        alert('Debe seleccionar el tipo de permiso');
        return;
      }

      if (!form.motivo || !form.motivo.trim()) {
        alert('El motivo es requerido');
        return;
      }

      // Validar que fecha_fin >= fecha_inicio
      const inicio = new Date(form.fecha_inicio);
      const fin = new Date(form.fecha_fin);
      if (fin < inicio) {
        alert('La fecha fin no puede ser anterior a la fecha inicio');
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
      } else {
        if (decoded && decoded.id) payload.creado_por = decoded.id;
        await axios.post(`${API_URL}/api/permisos/`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      }

      setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', tipo: '', motivo: '' });
      setMostrarModal(false);
      fetchPermisos();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error al crear permiso');
    }
  };

  const handleChangeEstado = async (id, nuevoEstado) => {
    try {
      const token = localStorage.getItem('token');
      const decoded = decodeToken();
      const payload = { estado: nuevoEstado };
      if (decoded && decoded.username) payload.autorizado_por = decoded.username;
      if (decoded && decoded.id) payload.modificado_por = decoded.id;
      await axios.put(`${API_URL}/api/permisos/${id}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchPermisos();
    } catch (err) {
      console.error(err);
      alert('Error al cambiar estado');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este permiso?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/permisos/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchPermisos();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar permiso');
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="permisos-container">
        <div className="permisos-header">
            <h2>Gestion de permisos</h2>
            <button className="btn-nuevo" onClick={() => setMostrarModal(true)}>+ Nuevo Permiso</button>
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
          <table className="permisos-table">
            <thead>
              <tr>
                <th>ID</th>
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
              {permisos.length ? permisos.map(p => {
                const emp = empleados.find(e => e.id === p.id_empleado);
                const nombreEmp = emp ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() : p.id_empleado;
                return (
                  <tr key={p.id_permiso}>
                    <td className="col-id">{p.id_permiso}</td>
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
                    <td>
                      <div className="action-buttons">
                        <button className="btn-aprobar" onClick={() => handleChangeEstado(p.id_permiso, 'aprobado')}>Aprobar</button>
                        <button className="btn-rechazar" onClick={() => handleChangeEstado(p.id_permiso, 'rechazado')}>Desaprobar</button>
                        <button className="btn-editar" onClick={() => {
                          setEditingId(p.id_permiso);
                          setForm({ id_empleado: p.id_empleado ? String(p.id_empleado) : '', fecha_inicio: formatDate(p.fecha_inicio), fecha_fin: formatDate(p.fecha_fin), tipo: p.tipo || '', motivo: p.descripcion || '' });
                          setMostrarModal(true);
                        }}>Editar</button>
                        <button className="btn-eliminar" onClick={() => handleDelete(p.id_permiso)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="11">No hay permisos registrados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Permisos;
