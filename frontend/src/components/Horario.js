import React, { useState, useEffect } from 'react';
import axios from 'axios';
// 1. Importamos el archivo CSS
import './Horario.css'; 

// Usamos 'Horario' como nombre de componente aunque el archivo sea 'Horario.js'
// para que su propósito (mostrar una lista) sea claro.
function Horario() {
    
    // Hooks de React para manejar el estado
    const [horarios, setHorarios] = useState([]); // Almacena la lista de horarios
    const [loading, setLoading] = useState(true); // Para mostrar un mensaje de "Cargando..."
    const [error, setError] = useState(null);     // Para mostrar un mensaje de error

    // useEffect se ejecuta una vez, cuando el componente se carga por primera vez.
    // Es el lugar perfecto para pedir datos al backend.
    useEffect(() => {
        
        // Definimos una función asíncrona para usar 'await'
        const fetchHorarios = async () => {
            try {
                // Usamos axios para hacer la petición GET a la API de Flask
                // Esta es la misma URL que probamos en Postman
                const response = await axios.get('http://127.0.0.1:5000/api/horarios/');
                
                // Guardamos los datos recibidos en el estado 'horarios'
                setHorarios(response.data);

            } catch (err) {
                // Si la petición falla, guardamos el mensaje de error
                setError('No se pudieron cargar los horarios. Intente más tarde.');
                console.error(err); // Mostramos el error detallado en la consola
            } finally {
                // Se ejecuta siempre (éxito o error)
                // Ocultamos el mensaje de "Cargando..."
                setLoading(false);
            }
        };

        // Llamamos a la función que acabamos de definir
        fetchHorarios();

    }, []); // El array vacío [] significa "ejecutar esto solo una vez"

    // --- Renderizado Condicional ---
    // 1. Mostrar "Cargando..." mientras esperamos la respuesta
    if (loading) {
        return <div className="horario-loading">Cargando horarios...</div>;
    }

    // 2. Mostrar el error si algo salió mal
    if (error) {
        return <div className="horario-error">{error}</div>;
    }

    // 3. Mostrar la tabla si todo salió bien
    return (
        <div className="horario-container">
            <h1>Gestión de Horarios</h1>
            <table className="horario-table">
                <thead>
                    <tr>
                        <th>ID Empleado</th>
                        <th>Turno</th>
                        <th>Días Laborables</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Descanso (min)</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Verificamos si hay horarios antes de intentar mostrarlos */}
                    {horarios.length > 0 ? (
                        // Usamos .map() para crear una fila <tr> por cada horario
                        horarios.map(horario => (
                            <tr key={horario.id_horario}>
                                <td>{horario.id_empleado}</td>
                                <td className="turno-cell">{horario.turno}</td>
                                <td>{horario.dia_laborables}</td>
                                <td>{horario.hora_entrada}</td>
                                <td>{horario.hora_salida}</td>
                                <td>{horario.descanso_minutos}</td>
                            </tr>
                        ))
                    ) : (
                        // Mensaje si no hay horarios
                        <tr>
                            <td colSpan="6">No hay horarios registrados.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default Horario;