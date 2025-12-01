import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import './Horario.css'; 

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Horario() {
    const [horarios, setHorarios] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [horarioActual, setHorarioActual] = useState({
        id_empleado: '',
        turno: '',
        dia_laborables: '',
        hora_entrada: '',
        hora_salida: '',
        descanso_minutos: '',
        inicio_vigencia: '',
        fin_vigencia: ''
    });

    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [isEmployeeSearchFocused, setIsEmployeeSearchFocused] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, []);

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().split('T')[0];
    };

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró token de autenticación.');
                setLoading(false);
                return;
            }

            const [horariosRes, empleadosRes] = await Promise.all([
                axios.get(`${API_URL}/api/horarios/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/empleados/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            setHorarios(horariosRes.data);
            setEmpleados(empleadosRes.data);
            setError(null);
        } catch (err) {
            setError('No se pudieron cargar los datos. Intente más tarde.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const abrirModal = (horario = null) => {
        if (horario) {
            setModoEdicion(true);
            const employeeName = empleados.find(e => e.id === horario.id_empleado);
            setEmployeeSearchQuery(employeeName ? `${employeeName.nombres} ${employeeName.apellidos}` : '');
            setHorarioActual({
                ...horario,
                hora_entrada: horario.hora_entrada ? horario.hora_entrada.substring(0, 5) : '',
                hora_salida: horario.hora_salida ? horario.hora_salida.substring(0, 5) : '',
                inicio_vigencia: formatDateForInput(horario.inicio_vigencia),
                fin_vigencia: formatDateForInput(horario.fin_vigencia)
            });
        } else {
            setModoEdicion(false);
            setEmployeeSearchQuery('');
            setHorarioActual({
                id_empleado: '',
                turno: 'Matutino',
                dia_laborables: 'Lunes a Viernes',
                hora_entrada: '',
                hora_salida: '',
                descanso_minutos: '60',
                inicio_vigencia: new Date().toISOString().split('T')[0],
                fin_vigencia: ''
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
        setHorarioActual(prev => ({ ...prev, [name]: value }));
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
        setHorarioActual(prev => ({ ...prev, id_empleado: employee.id }));
        setEmployeeSearchQuery(`${employee.nombres} ${employee.apellidos}`);
        setFilteredEmployees([]);
        setIsEmployeeSearchFocused(false);
    };

    const guardarHorario = async (e) => {
        e.preventDefault();

        if (!horarioActual.id_empleado) {
            setError("Debe seleccionar un empleado de la lista.");
            return;
        }

        const dataToSend = {
            ...horarioActual,
            id_empleado: parseInt(horarioActual.id_empleado, 10),
            descanso_minutos: horarioActual.descanso_minutos ? parseInt(horarioActual.descanso_minutos, 10) : null,
            fin_vigencia: horarioActual.fin_vigencia || null
        };

        const token = localStorage.getItem('token');
        const url = modoEdicion
            ? `${API_URL}/api/horarios/${horarioActual.id_horario}`
            : `${API_URL}/api/horarios/`;
        const method = modoEdicion ? 'put' : 'post';

        try {
            await axios[method](url, dataToSend, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            cargarDatos();
            cerrarModal();
        } catch (error) {
            console.error('Error al guardar el horario:', error);
            if (error.response && error.response.data && error.response.data.error) {
                setError(`Error: ${error.response.data.error}`);
            } else {
                setError('No se pudo guardar el horario. Verifique los datos o contacte al administrador.');
            }
        }
    };

    const eliminarHorario = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este horario?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/horarios/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                cargarDatos();
            } catch (error) {
                console.error('Error al eliminar el horario:', error);
                setError('No se pudo eliminar el horario.');
            }
        }
    };

    if (loading) return <div className="horario-loading">Cargando...</div>;
    if (error) return <div className="horario-error" onClick={() => setError(null)}>{error}</div>;

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar />
            <div className="horario-container">
                <div className="horario-header">
                    <h1>Gestión de Horarios</h1>
                    <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Horario</button>
                </div>
                <table className="horario-table">
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Turno</th>
                            <th>Días Laborables</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Descanso (min)</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {horarios.map(horario => {
                            const empleado = empleados.find(e => e.id === horario.id_empleado);
                            return (
                                <tr key={horario.id_horario}>
                                    <td>{empleado ? `${empleado.nombres} ${empleado.apellidos}` : horario.id_empleado}</td>
                                    <td className="turno-cell">{horario.turno}</td>
                                    <td>{horario.dia_laborables}</td>
                                    <td>{horario.hora_entrada}</td>
                                    <td>{horario.hora_salida}</td>
                                    <td>{horario.descanso_minutos}</td>
                                    <td>
                                        <button className="btn-editar" onClick={() => abrirModal(horario)}>Editar</button>
                                        <button className="btn-eliminar" onClick={() => eliminarHorario(horario.id_horario)}>Eliminar</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {mostrarModal && (
                <div className="modal">
                    <div className="modal-contenido">
                        <h3>{modoEdicion ? 'Editar Horario' : 'Nuevo Horario'}</h3>
                        <form onSubmit={guardarHorario} autoComplete="off">
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
                                            required={!horarioActual.id_empleado}
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
                                <label>Turno</label>
                                <select name="turno" value={horarioActual.turno} onChange={handleChange}>
                                    <option value="Matutino">Matutino</option>
                                    <option value="Vespertino">Vespertino</option>
                                    <option value="Nocturno">Nocturno</option>
                                </select>
                            </div>
                            <div className="form-grupo">
                                <label>Días Laborables</label>
                                <input type="text" name="dia_laborables" value={horarioActual.dia_laborables} onChange={handleChange} placeholder="Ej: Lunes a Viernes" />
                            </div>
                             <div className="form-grupo">
                                <label>Inicio de Vigencia</label>
                                <input type="date" name="inicio_vigencia" value={horarioActual.inicio_vigencia} onChange={handleChange} required />
                            </div>
                            <div className="form-grupo">
                                <label>Fin de Vigencia (Opcional)</label>
                                <input type="date" name="fin_vigencia" value={horarioActual.fin_vigencia} onChange={handleChange} />
                            </div>
                            <div className="form-grupo">
                                <label>Hora de Entrada</label>
                                <input type="time" name="hora_entrada" value={horarioActual.hora_entrada} onChange={handleChange} required />
                            </div>
                            <div className="form-grupo">
                                <label>Hora de Salida</label>
                                <input type="time" name="hora_salida" value={horarioActual.hora_salida} onChange={handleChange} required />
                            </div>
                            <div className="form-grupo">
                                <label>Descanso (minutos)</label>
                                <input type="number" name="descanso_minutos" value={horarioActual.descanso_minutos} onChange={handleChange} />
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

export default Horario;