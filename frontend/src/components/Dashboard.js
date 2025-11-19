import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    const [empleados, setEmpleados] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/');
            return;
        }

        // Decodificar el JWT para obtener la información del usuario
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUsuario({
                username: payload.username,
                rol: payload.rol,
                id: payload.user_id
            });
        } catch (error) {
            console.error('Error al decodificar token:', error);
            localStorage.removeItem('token');
            navigate('/');
            return;
        }

        cargarEmpleados(token);
    }, [navigate]);

    const cargarEmpleados = async (token) => {
        try {
            setCargando(true);
            
            const respuesta = await fetch('http://127.0.0.1:5000/api/empleados/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!respuesta.ok) {
                if (respuesta.status === 401) {
                    const errorData = await respuesta.json();
                    alert(`Sesión expirada: ${errorData.error || 'Token inválido'}`);
                    localStorage.removeItem('token');
                    navigate('/');
                    return;
                }
                throw new Error('Error al cargar empleados');
            }

            const data = await respuesta.json();
            setEmpleados(data);
            setError(null);
            
        } catch (err) {
            console.error('Error:', err);
            setError('No se pudieron cargar los empleados');
        } finally {
            setCargando(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    if (!usuario) {
        return (
            <div className="loading-container">
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="main-content">
                <header className="dashboard-header">
                    <div className="user-info">
                        <h1>Bienvenido, {usuario.username}</h1>
                        <p className="user-role">Rol: {usuario.rol}</p>
                        <p className="session-status">✅ Sesión activa</p>
                    </div>
                    <button onClick={handleLogout} className="btn-logout">
                        Cerrar Sesión
                    </button>
                </header>

                <section className="empleados-section">
                    <h2>Empleados</h2>
                    
                    {cargando && (
                        <div className="loading">
                            <p>Cargando empleados...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="error-message">
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {!cargando && !error && (
                        <div className="table-container">
                            <table className="tabla-empleados">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Cargo</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {empleados.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="no-data">
                                                No hay empleados registrados
                                            </td>
                                        </tr>
                                    ) : (
                                        empleados.map(empleado => (
                                            <tr key={empleado.id}>
                                                <td>{empleado.id}</td>
                                                <td>{empleado.nombres} {empleado.apellidos}</td>
                                                <td>{empleado.cargo_id}</td>
                                                <td>
                                                    <span className={`badge badge-${empleado.estado.toLowerCase()}`}>
                                                        {empleado.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Dashboard;