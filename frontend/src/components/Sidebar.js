import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Sidebar() {
    const [permisos, setPermisos] = useState(['dashboard']); // Dashboard siempre visible por defecto

    useEffect(() => {
        const cargarPermisos = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setPermisos(['dashboard']);
                return;
            }

            try {
                // Decodificar token para obtener el cargo del usuario
                const payload = JSON.parse(atob(token.split('.')[1]));
                const nombreCargo = payload.rol;
                console.log('Cargo del usuario:', nombreCargo);

                // Si es administrador, mostrar todos los módulos
                if (nombreCargo.toLowerCase() === 'administrador' || nombreCargo.toLowerCase() === 'admin') {
                    setPermisos(['dashboard', 'cargos', 'usuarios', 'empleados', 'hojas-vida', 'asistencias', 'horarios', 'permisos', 'nomina', 'rubros', 'logs']);
                    return;
                }

                // Cargar todos los cargos para encontrar los permisos
                const response = await fetch(`${API_URL}/api/cargos/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const cargos = await response.json();
                    console.log('Cargos cargados:', cargos);
                    const cargoUsuario = cargos.find(c => c.nombre_cargo === nombreCargo);
                    console.log('Cargo del usuario encontrado:', cargoUsuario);
                    
                    if (cargoUsuario && cargoUsuario.permisos) {
                        console.log('Permisos del cargo:', cargoUsuario.permisos);
                        setPermisos(cargoUsuario.permisos);
                    } else {
                        // Si no hay permisos definidos, solo mostrar dashboard
                        console.log('No se encontraron permisos, usando solo dashboard');
                        setPermisos(['dashboard']);
                    }
                } else {
                    console.log('Error al cargar cargos, response no ok');
                    setPermisos(['dashboard']);
                }
            } catch (error) {
                console.error('Error al cargar permisos:', error);
                setPermisos(['dashboard']);
            }
        };

        cargarPermisos();
    }, []);

    // Definir todos los módulos disponibles
    const modulos = [
        { id: 'dashboard', nombre: '🏠 Dashboard', ruta: '/dashboard' },
        { id: 'cargos', nombre: 'Cargos', ruta: '/cargos' },
        { id: 'usuarios', nombre: 'Usuarios', ruta: '/usuarios' },
        { id: 'empleados', nombre: 'Empleados', ruta: '/empleados' },
        { id: 'hojas-vida', nombre: 'Hojas de Vida', ruta: '/hojas-vida' },
        { id: 'asistencias', nombre: 'Asistencias', ruta: '/asistencias' },
        { id: 'horarios', nombre: 'Horarios', ruta: '/horarios' },
        { id: 'permisos', nombre: 'Permisos / Vacaciones', ruta: '/permisos' },
        { id: 'nomina', nombre: 'Nómina', ruta: '/nomina' },
        { id: 'rubros', nombre: 'Rubros de pago', ruta: '/rubros' },
        { id: 'logs', nombre: 'Auditoría / Logs', ruta: '/logs' }
    ];

    return (
        <aside className="sidebar">
            <h2>Módulos</h2>
            <nav>
                <ul>
                    {modulos.map(modulo => (
                        permisos.includes(modulo.id) && (
                            <li key={modulo.id}>
                                <a href={modulo.ruta}>{modulo.nombre}</a>
                            </li>
                        )
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

export default Sidebar;