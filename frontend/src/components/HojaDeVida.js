import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './HojaDeVida.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function HojaDeVida() {
    const [hojasVida, setHojasVida] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [registroActual, setRegistroActual] = useState({
        id_empleado: '',
        tipo: 'Educacion',
        nombre_documento: '',
        institucion: '',
        fecha_inicio: '',
        fecha_finalizacion: '',
    });

    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [isEmployeeSearchFocused, setIsEmployeeSearchFocused] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró token de autenticación.');
                return;
            }
            const config = { headers: { 'Authorization': `Bearer ${token}` } };
            const [resHojas, resEmpleados] = await Promise.all([
                axios.get(`${API_URL}/api/hojas-vida/`, config),
                axios.get(`${API_URL}/api/empleados/`, config)
            ]);
            setHojasVida(resHojas.data);
            setEmpleados(resEmpleados.data);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar los datos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (registro = null) => {
        if (registro) {
            setModoEdicion(true);
            const employeeName = empleados.find(e => e.id === registro.id_empleado);
            setEmployeeSearchQuery(employeeName ? `${employeeName.nombres} ${employeeName.apellidos}` : '');
            setRegistroActual({
                ...registro,
                fecha_inicio: formatDateForInput(registro.fecha_inicio),
                fecha_finalizacion: formatDateForInput(registro.fecha_finalizacion),
            });
        } else {
            setModoEdicion(false);
            setEmployeeSearchQuery('');
            setRegistroActual({
                id_empleado: '',
                tipo: 'Educacion',
                nombre_documento: '',
                institucion: '',
                fecha_inicio: '',
                fecha_finalizacion: '',
            });
        }
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setEmployeeSearchQuery('');
        setFilteredEmployees([]);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setRegistroActual(prev => ({ ...prev, [name]: value }));
    };

    const handleEmployeeSearchChange = (e) => {
        const query = e.target.value;
        setEmployeeSearchQuery(query);
        if (query.length > 1) {
            const filtered = empleados.filter(emp => 
                `${emp.nombres} ${emp.apellidos}`.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredEmployees(filtered);
        } else {
            setFilteredEmployees([]);
        }
    };

    const handleSelectEmployee = (employee) => {
        setRegistroActual(prev => ({ ...prev, id_empleado: employee.id }));
        setEmployeeSearchQuery(`${employee.nombres} ${employee.apellidos}`);
        setFilteredEmployees([]);
        setIsEmployeeSearchFocused(false);
    };

    const guardarRegistro = async (e) => {
        e.preventDefault();

        if (!registroActual.id_empleado) {
            setError("Debe seleccionar un empleado de la lista.");
            return;
        }

        const dataToSend = {
            ...registroActual,
            id_empleado: parseInt(registroActual.id_empleado, 10),
            fecha_inicio: registroActual.fecha_inicio || null,
            fecha_finalizacion: registroActual.fecha_finalizacion || null,
        };

        const token = localStorage.getItem('token');
        const url = modoEdicion
            ? `${API_URL}/api/hojas-vida/${registroActual.id_hoja_vida}`
            : `${API_URL}/api/hojas-vida/`;
        const method = modoEdicion ? 'put' : 'post';

        try {
            await axios[method](url, dataToSend, { headers: { 'Authorization': `Bearer ${token}` } });
            cargarDatos();
            cerrarModal();
        } catch (error) {
            console.error('Error guardando registro:', error);
            setError('No se pudo guardar el registro.');
        }
    };

    const eliminarRegistro = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este registro?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/hojas-vida/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                cargarDatos();
            } catch (error) {
                console.error('Error eliminando registro:', error);
                setError('No se pudo eliminar el registro.');
            }
        }
    };

    if (loading) return <div className="hv-loading">Cargando...</div>;
    if (error) return <div className="hv-error" onClick={() => setError(null)}>{error}</div>;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="hv-container">
                <div className="hv-header">
                    <h1>Registros de Hoja de Vida</h1>
                    <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Registro</button>
                </div>

                <table className="hv-table">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Documento</th>
                            <th>Tipo</th>
                            <th>Institución</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hojasVida.length > 0 ? hojasVida.map(registro => {
                            const empleado = empleados.find(e => e.id === registro.id_empleado);
                            return (
                                <tr key={registro.id_hoja_vida}>
                                    <td>{empleado ? `${empleado.nombres} ${empleado.apellidos}` : registro.id_empleado}</td>
                                    <td>{registro.nombre_documento}</td>
                                    <td>{registro.tipo}</td>
                                    <td>{registro.institucion}</td>
                                    <td>
                                        <button className="btn-editar" onClick={() => abrirModal(registro)}>Editar</button>
                                        <button className="btn-eliminar" onClick={() => eliminarRegistro(registro.id_hoja_vida)}>Eliminar</button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan="5">No hay registros.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {mostrarModal && (
                <div className="modal">
                    <div className="modal-contenido">
                        <h3>{modoEdicion ? 'Editar Registro' : 'Nuevo Registro'}</h3>
                        <form onSubmit={guardarRegistro} autoComplete="off">
                            <div className="form-grupo">
                                <label>Empleado</label>
                                {modoEdicion ? (
                                    <input type="text" value={employeeSearchQuery} readOnly disabled />
                                ) : (
                                    <div className="search-container">
                                        <input
                                            type="text"
                                            value={employeeSearchQuery}
                                            onChange={handleEmployeeSearchChange}
                                            onFocus={() => setIsEmployeeSearchFocused(true)}
                                            onBlur={() => setTimeout(() => setIsEmployeeSearchFocused(false), 200)}
                                            placeholder="Buscar empleado..."
                                            required={!registroActual.id_empleado}
                                        />
                                        {isEmployeeSearchFocused && filteredEmployees.length > 0 && (
                                            <ul className="search-results">
                                                {filteredEmployees.map(emp => (
                                                    <li key={emp.id} onClick={() => handleSelectEmployee(emp)}>
                                                        {emp.nombres} {emp.apellidos}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="form-grupo">
                                <label>Tipo de Registro</label>
                                <select name="tipo" value={registroActual.tipo} onChange={handleChange}>
                                    <option value="Educacion">Educación</option>
                                    <option value="Experiencia">Experiencia Laboral</option>
                                    <option value="Certificacion">Certificación</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="form-grupo">
                                <label>Nombre del Documento/Título</label>
                                <input type="text" name="nombre_documento" value={registroActual.nombre_documento} onChange={handleChange} required />
                            </div>
                            <div className="form-grupo">
                                <label>Institución o Empresa</label>
                                <input type="text" name="institucion" value={registroActual.institucion} onChange={handleChange} />
                            </div>
                            <div className="form-grupo">
                                <label>Fecha de Inicio</label>
                                <input type="date" name="fecha_inicio" value={registroActual.fecha_inicio} onChange={handleChange} />
                            </div>
                            <div className="form-grupo">
                                <label>Fecha de Finalización</label>
                                <input type="date" name="fecha_finalizacion" value={registroActual.fecha_finalizacion} onChange={handleChange} />
                            </div>
                            <div className="form-botones">
                                <button type="submit" className="btn-guardar">Guardar</button>
                                <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HojaDeVida;