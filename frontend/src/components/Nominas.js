import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Nominas.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Nominas() {
  const [nominas, setNominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });

  useEffect(() => {
    fetchNominas();
  }, []);

  const fetchNominas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/nominas/`);
      setNominas(res.data);
      setError('');
    } catch (err) {
      setError('Error al cargar nóminas');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id_empleado: parseInt(form.id_empleado, 10),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        total: parseFloat(form.total) || 0,
        creado_por: 1
      };
      await axios.post(`${API_URL}/api/nominas/`, payload);
      setForm({ id_empleado: '', fecha_inicio: '', fecha_fin: '', total: '' });
      fetchNominas();
    } catch (err) {
      setError('Error al crear nómina');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta nómina?')) return;
    try {
      await axios.delete(`${API_URL}/api/nominas/${id}`);
      fetchNominas();
    } catch (err) {
      setError('Error al eliminar nómina');
    }
  };

  return (
    <div className="nominas-container">
      <h2 className="title">Nóminas</h2>

      <form className="nomina-form" onSubmit={handleCreate}>
        <input name="id_empleado" placeholder="ID Empleado" value={form.id_empleado} onChange={handleChange} />
        <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} />
        <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} />
        <input name="total" placeholder="Total" value={form.total} onChange={handleChange} />
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
                  <button className="btn-delete" onClick={() => handleDelete(n.id_nomina)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Nominas;
