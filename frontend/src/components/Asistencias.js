import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Asistencias.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Asistencias() {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', fecha: '', hora_entrada: '', hora_salida: '' });
  const [empleados, setEmpleados] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!form.id_empleado) { alert('Seleccione un empleado'); return; }
      if (!form.fecha) { alert('Seleccione la fecha'); return; }
      if (!form.hora_entrada) { alert('Ingrese la hora de entrada'); return; }
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
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error al crear asistencia');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta asistencia?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/asistencias/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchAsistencias();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar asistencia');
    }
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

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="asistencias-container">
        <div className="asistencias-header">
          <h2>Gestion de Asistencias</h2>
          <button className="btn-nuevo" onClick={() => setMostrarModal(true)}>+ Nueva Asistencia</button>
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
          <table className="asistencias-table">
            <thead>
              <tr>
                <th>ID</th>
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
              {asistencias.length ? asistencias.map(a => {
                const emp = empleados.find(e => e.id === a.id_empleado);
                const nombreEmp = emp ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() : a.id_empleado;
                return (
                  <tr key={a.id_asistencia}>
                    <td className="col-id">{a.id_asistencia}</td>
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
                        <button className="btn-editar" onClick={() => {
                          setEditingId(a.id_asistencia);
                          setForm({ id_empleado: a.id_empleado.toString(), fecha: a.fecha, hora_entrada: a.hora_entrada, hora_salida: a.hora_salida || '' });
                          setMostrarModal(true);
                        }}>Editar</button>
                        <button className="btn-eliminar" onClick={() => handleDelete(a.id_asistencia)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="10">No hay asistencias registradas.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Asistencias;
