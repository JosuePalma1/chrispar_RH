import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const AVAILABLE_MODULES = ['dashboard', 'cargos', 'usuarios', 'empleados', 'hojas-vida', 'horarios', 'nomina', 'rubros'];

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

                // Si es administrador, mostrar todos los módulos
                if (nombreCargo.toLowerCase() === 'administrador' || nombreCargo.toLowerCase() === 'admin') {
                    setPermisos(AVAILABLE_MODULES);
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
                    const cargoUsuario = cargos.find(c => c.nombre_cargo === nombreCargo);
                    
                    if (cargoUsuario && cargoUsuario.permisos) {
                        const permisosCargo = Array.isArray(cargoUsuario.permisos)
                            ? cargoUsuario.permisos
                            : JSON.parse(cargoUsuario.permisos || '[]');
                        const permisosValidos = permisosCargo.filter((permiso) => AVAILABLE_MODULES.includes(permiso));
                        setPermisos(permisosValidos.length ? permisosValidos : ['dashboard']);
                    } else {
                        setPermisos(['dashboard']);
                    }
                } else {
                    setPermisos(['dashboard']);
                }
            } catch (error) {
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
        { id: 'horarios', nombre: 'Horarios', ruta: '/horarios' },
        { id: 'nomina', nombre: 'Nómina', ruta: '/nomina' },
        { id: 'rubros', nombre: 'Rubros de pago', ruta: '/rubros' }
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