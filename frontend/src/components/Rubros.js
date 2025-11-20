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

  const handleCreate = async (e) => {
    e.preventDefault();
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
      console.log('Enviando rubro:', payload);
      const response = await axios.post(`${API_URL}/api/rubros/`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Respuesta:', response.data);
      alert('Rubro creado exitosamente');
      setForm({ id_nomina: '', codigo: '', descripcion: '', tipo: 'devengo', monto: '' });
      fetchRubros();
    } catch (err) {
      console.error('Error completo:', err.response?.data || err);
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

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="rubros-container">
        <h2 className="title">Rubros</h2>

        <form className="rubro-form" onSubmit={handleCreate}>
        <input name="id_nomina" placeholder="ID Nómina" value={form.id_nomina} onChange={handleChange} required />
        <input name="codigo" placeholder="Código" value={form.codigo} onChange={handleChange} required />
        <input name="descripcion" placeholder="Descripción" value={form.descripcion} onChange={handleChange} required />
        <select name="tipo" value={form.tipo} onChange={handleChange} required>
          <option value="devengo">Devengo</option>
          <option value="deduccion">Deducción</option>
        </select>
        <input name="monto" placeholder="Monto" value={form.monto} onChange={handleChange} required />
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
                  <button className="btn-delete" onClick={() => handleDelete(r.id_rubro)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}

export default Rubros;
