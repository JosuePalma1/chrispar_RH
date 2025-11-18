import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HojaDeVida.css'; // Importamos los estilos

// Renombramos el componente para que sea claro
function HojaDeVida() {
    
    // --- Estados del Componente ---
    const [hojasVida, setHojasVida] = useState([]); // Almacena la lista de registros
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // **NUEVO ESTADO**: Almacena el registro que el usuario seleccionó
    // Si es 'null', el modal está cerrado.
    // Si es un objeto, el modal está abierto y muestra este objeto.
    const [selectedRegistro, setSelectedRegistro] = useState(null);

    // --- Carga de Datos (similar a Horarios) ---
    useEffect(() => {
        const fetchHojasVida = async () => {
            try {
                // Usamos la API de hojas_vida que probamos en Postman
                const response = await axios.get('http://127.0.0.1:5000/api/hojas-vida/');
                setHojasVida(response.data);
            } catch (err) {
                setError('No se pudieron cargar los registros. Intente más tarde.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHojasVida();
    }, []);

    // --- Funciones para el Modal ---
    
    // Se ejecuta cuando el usuario hace clic en "Abrir"
    const handleOpenModal = (registro) => {
        setSelectedRegistro(registro);
    };

    // Se ejecuta para cerrar el modal
    const handleCloseModal = () => {
        setSelectedRegistro(null);
    };


    // --- Renderizado ---
    if (loading) return <div className="hv-loading">Cargando registros...</div>;
    if (error) return <div className="hv-error">{error}</div>;

    return (
        <div className="hv-container">
            <h1>Registros de Hoja de Vida</h1>
            
            {/* --- La Lista Principal --- */}
            <ul className="hv-list">
                {hojasVida.length > 0 ? (
                    hojasVida.map(registro => (
                        <li key={registro.id_hoja_vida}>
                            {/* Mostramos solo el nombre del documento */}
                            <span className="hv-nombre">{registro.nombre_documento}</span>
                            
                            {/* Botón para abrir el modal */}
                            <button 
                                className="hv-open-btn"
                                onClick={() => handleOpenModal(registro)}
                            >
                                Abrir
                            </button>
                        </li>
                    ))
                ) : (
                    <li>No hay registros de hoja de vida.</li>
                )}
            </ul>

            {/* --- El Modal (se muestra solo si 'selectedRegistro' no es null) --- */}
            {selectedRegistro && (
                // Fondo oscuro
                <div className="modal-overlay" onClick={handleCloseModal}>
                    
                    {/* Contenido del modal (stopPropagation evita que se cierre al hacer clic dentro) */}
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        
                        <h2>Detalle del Registro</h2>
                        
                        <div className="modal-body">
                            <p><strong>Empleado ID:</strong> {selectedRegistro.id_empleado}</p>
                            <p><strong>Documento:</strong> {selectedRegistro.nombre_documento}</p>
                            <p><strong>Tipo:</strong> {selectedRegistro.tipo}</p>
                            <p><strong>Institución:</strong> {selectedRegistro.institucion}</p>
                            <p><strong>Fecha Inicio:</strong> {selectedRegistro.fecha_inicio}</p>
                            <p><strong>Fecha Fin:</strong> {selectedRegistro.fecha_finalizacion}</p>
                            <p><strong>Ubicación Archivo:</strong> {selectedRegistro.ruta_archivo_url}</p>
                        </div>
                        
                        <button 
                            className="modal-close-btn" 
                            onClick={handleCloseModal}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
            
        </div>
    );
}

export default HojaDeVida;