import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import './Empleados.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioPendiente, setUsuarioPendiente] = useState(null);
  const [empleadoActual, setEmpleadoActual] = useState({
    id: null,
    id_usuario: '',
    cargo_id: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    cedula: '',
    estado: 'activo',
    fecha_ingreso: '',
    fecha_egreso: '',
    tipo_cuenta_bancaria: '',
    numero_cuenta_bancaria: '',
    modalidad_fondo_reserva: 'Mensual',
    modalidad_decimos: 'Mensual'
  });

  useEffect(() => {
    cargarEmpleados();
    cargarCargos();
    cargarUsuarios();
    
    // Verificar si viene desde Usuarios para completar datos
    const params = new URLSearchParams(window.location.search);
    if (params.get('crear') === 'true') {
      const usuarioData = sessionStorage.getItem('usuarioParaEmpleado');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioPendiente(usuario);
        sessionStorage.removeItem('usuarioParaEmpleado');
      }
    }
  }, []);

  // Abrir modal cuando los cargos estén cargados y haya un usuario pendiente
  useEffect(() => {
    if (usuarioPendiente && cargos.length > 0) {
      abrirModalConUsuario(usuarioPendiente);
      setUsuarioPendiente(null);
    }
  }, [usuarioPendiente, cargos]);

  const cargarEmpleados = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/empleados/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      
      const data = await response.json();
      setEmpleados(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const cargarCargos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cargos/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCargos(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/usuarios/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const abrirModal = (empleado = null) => {
    if (empleado) {
      // Convertir fechas de YYYY-MM-DD a formato input date
      const formatearFecha = (fecha) => {
        if (!fecha) return '';
        // Si ya está en formato YYYY-MM-DD, devolverlo tal cual
        if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) return fecha;
        // Si no, intentar convertir
        try {
          const date = new Date(fecha);
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };
      
      setEmpleadoActual({
        id: empleado.id,
        id_usuario: empleado.id_usuario || empleado.usuario_id || '',
        cargo_id: empleado.cargo_id || empleado.id_cargo || '',
        nombres: empleado.nombres || '',
        apellidos: empleado.apellidos || '',
        fecha_nacimiento: formatearFecha(empleado.fecha_nacimiento),
        cedula: empleado.cedula || '',
        estado: empleado.estado || 'activo',
        fecha_ingreso: formatearFecha(empleado.fecha_ingreso),
        fecha_egreso: formatearFecha(empleado.fecha_egreso),
        tipo_cuenta_bancaria: empleado.tipo_cuenta_bancaria || '',
        numero_cuenta_bancaria: empleado.numero_cuenta_bancaria || '',
        modalidad_fondo_reserva: empleado.modalidad_fondo_reserva || 'Mensual',
        modalidad_decimos: empleado.modalidad_decimos || 'Mensual'
      });
      setModoEdicion(true);
    } else {
      setEmpleadoActual({
        id: null,
        id_usuario: '',
        cargo_id: '',
        nombres: '',
        apellidos: '',
        fecha_nacimiento: '',
        cedula: '',
        estado: 'activo',
        fecha_ingreso: '',
        fecha_egreso: '',
        tipo_cuenta_bancaria: '',
        numero_cuenta_bancaria: '',
        modalidad_fondo_reserva: 'Mensual',
        modalidad_decimos: 'Mensual'
      });
      setModoEdicion(false);
    }
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
  };

  const abrirModalConUsuario = (usuario) => {
    // Buscar el cargo que corresponde al rol del usuario
    const cargoCorrespondiente = cargos.find(c => c.nombre_cargo === usuario.rol);
    const cargoIdValor = cargoCorrespondiente?.id ?? cargoCorrespondiente?.id_cargo;
    const cargoId = cargoIdValor ? cargoIdValor.toString() : '';
    
    setEmpleadoActual({
      id: null,
      id_usuario: usuario.id.toString(),
      cargo_id: cargoId,
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      cedula: '',
      estado: 'activo',
      fecha_ingreso: '',
      fecha_egreso: '',
      tipo_cuenta_bancaria: '',
      numero_cuenta_bancaria: '',
      modalidad_fondo_reserva: 'Mensual',
      modalidad_decimos: 'Mensual'
    });
    setModoEdicion(false);
    setMostrarModal(true);
  };

  const manejarCambioUsuario = (idUsuario) => {
    // Si se deselecciona el usuario (valor vacío), solo actualizar id_usuario
    if (!idUsuario) {
      setEmpleadoActual({...empleadoActual, id_usuario: ''});
      return;
    }
    
    const usuarioSeleccionado = usuarios.find(u => u.id === parseInt(idUsuario));
    
    if (usuarioSeleccionado && usuarioSeleccionado.rol) {
      // Buscar el cargo que coincide con el rol del usuario
      const cargoCorrespondiente = cargos.find(c => c.nombre_cargo === usuarioSeleccionado.rol);
      
      // El backend puede devolver 'id' o 'id_cargo' dependiendo del endpoint
      const idCargo = cargoCorrespondiente?.id_cargo || cargoCorrespondiente?.id;
      
      if (cargoCorrespondiente && idCargo) {
        setEmpleadoActual({
          ...empleadoActual,
          id_usuario: idUsuario,
          cargo_id: idCargo.toString()
        });
      } else {
        // Usuario sin cargo correspondiente, mantener el cargo actual
        alert(`El usuario tiene el rol "${usuarioSeleccionado.rol}" pero no existe un cargo con ese nombre. Por favor, selecciona el cargo manualmente.`);
        setEmpleadoActual({...empleadoActual, id_usuario: idUsuario});
      }
    } else {
      // Usuario sin rol definido, mantener el cargo actual
      alert('El usuario no tiene un rol asignado. Por favor, selecciona el cargo manualmente.');
      setEmpleadoActual({...empleadoActual, id_usuario: idUsuario});
    }
  };

  const manejarCambioCargo = async (idCargo) => {
    setEmpleadoActual({...empleadoActual, cargo_id: idCargo});
    
    // Si hay un usuario asignado, actualizar su rol
    if (empleadoActual.id_usuario && idCargo) {
      // Buscar por 'id' no por 'id_cargo'
      const cargoSeleccionado = cargos.find(c => c.id === parseInt(idCargo));
      
      if (cargoSeleccionado) {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${API_URL}/api/usuarios/${empleadoActual.id_usuario}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rol: cargoSeleccionado.nombre_cargo
            })
          });
          // Recargar usuarios para reflejar el cambio
          cargarUsuarios();
        } catch (error) {
          console.error('Error al actualizar rol del usuario:', error);
        }
      }
    }
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    
    // Validar que cargo_id tenga valor
    if (!empleadoActual.cargo_id) {
      alert('Debe seleccionar un cargo');
      return;
    }
    
    const token = localStorage.getItem('token');
    
    const datosEmpleado = {
      ...empleadoActual,
      id_usuario: empleadoActual.id_usuario ? parseInt(empleadoActual.id_usuario) : null,
      id_cargo: parseInt(empleadoActual.cargo_id), // Backend espera id_cargo
      fecha_egreso: empleadoActual.fecha_egreso || null
    };
    
    // Eliminar cargo_id ya que el backend no lo reconoce
    delete datosEmpleado.cargo_id;
    
    try {
      const url = modoEdicion 
        ? `${API_URL}/api/empleados/${empleadoActual.id}`
        : `${API_URL}/api/empleados/`;
      
      const method = modoEdicion ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosEmpleado)
      });

      if (response.ok) {
        alert('Empleado guardado exitosamente');
        cargarEmpleados();
        cerrarModal();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'No se pudo guardar el empleado'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el empleado');
    }
  };

  const eliminarEmpleado = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este empleado?')) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/empleados/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          alert('Empleado eliminado exitosamente');
          cargarEmpleados();
        } else {
          const error = await response.json();
          alert(`Error: ${error.error || 'No se pudo eliminar el empleado'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar el empleado');
      }
    }
  };

  const getNombreCargo = (cargo_id) => {
    const cargo = cargos.find(c => c.id === cargo_id);
    return cargo ? cargo.nombre_cargo : 'N/A';
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="empleados-container">
        <div className="empleados-header">
          <h2>Gestión de Empleados</h2>
          <button className="btn-nuevo" onClick={() => abrirModal()}>+ Nuevo Empleado</button>
        </div>

        <table className="empleados-tabla">
        <thead>
          <tr>
            <th>Cédula</th>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th>Cargo</th>
            <th>Estado</th>
            <th>Fecha Ingreso</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map(empleado => (
            <tr key={empleado.id}>
              <td>{empleado.cedula}</td>
              <td>{empleado.nombres}</td>
              <td>{empleado.apellidos}</td>
              <td>{getNombreCargo(empleado.cargo_id)}</td>
              <td>
                <span className={`estado ${empleado.estado}`}>{empleado.estado}</span>
              </td>
              <td>{empleado.fecha_ingreso}</td>
              <td>
                <button className="btn-editar" onClick={() => abrirModal(empleado)}>Editar</button>
                <button className="btn-eliminar" onClick={() => eliminarEmpleado(empleado.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarModal && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>{modoEdicion ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
            <form onSubmit={guardarEmpleado}>
              <div className="form-row">
                <div className="form-grupo">
                  <label>Nombres:</label>
                  <input
                    type="text"
                    value={empleadoActual.nombres}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, nombres: e.target.value})}
                    required
                  />
                </div>
                <div className="form-grupo">
                  <label>Apellidos:</label>
                  <input
                    type="text"
                    value={empleadoActual.apellidos}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, apellidos: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Cédula:</label>
                  <input
                    type="text"
                    value={empleadoActual.cedula}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, cedula: e.target.value})}
                    required
                  />
                </div>
                <div className="form-grupo">
                  <label>Fecha Nacimiento:</label>
                  <input
                    type="date"
                    value={empleadoActual.fecha_nacimiento}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, fecha_nacimiento: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Cargo:</label>
                  <select
                    value={empleadoActual.cargo_id}
                    onChange={(e) => manejarCambioCargo(e.target.value)}
                    required
                  >
                    <option value="">Seleccione un cargo</option>
                    {cargos.map(cargo => (
                      <option key={cargo.id} value={cargo.id}>
                        {cargo.nombre_cargo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Usuario (Opcional):</label>
                  <select
                    value={empleadoActual.id_usuario}
                    onChange={(e) => manejarCambioUsuario(e.target.value)}
                  >
                    <option value="">Sin usuario asignado</option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.username} {usuario.rol && `(${usuario.rol})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Estado:</label>
                  <select
                    value={empleadoActual.estado}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, estado: e.target.value})}
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Fecha Ingreso:</label>
                  <input
                    type="date"
                    value={empleadoActual.fecha_ingreso}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, fecha_ingreso: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Tipo Cuenta:</label>
                  <input
                    type="text"
                    value={empleadoActual.tipo_cuenta_bancaria}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, tipo_cuenta_bancaria: e.target.value})}
                  />
                </div>
                <div className="form-grupo">
                  <label>Número Cuenta:</label>
                  <input
                    type="text"
                    value={empleadoActual.numero_cuenta_bancaria}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, numero_cuenta_bancaria: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-grupo">
                  <label>Modalidad Fondo Reserva:</label>
                  <select
                    value={empleadoActual.modalidad_fondo_reserva}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, modalidad_fondo_reserva: e.target.value})}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Acumulado">Acumulado</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label>Modalidad Décimos:</label>
                  <select
                    value={empleadoActual.modalidad_decimos}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, modalidad_decimos: e.target.value})}
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Acumulado">Acumulado</option>
                  </select>
                </div>
              </div>

              {empleadoActual.estado === 'inactivo' && (
                <div className="form-grupo">
                  <label>Fecha Egreso:</label>
                  <input
                    type="date"
                    value={empleadoActual.fecha_egreso}
                    onChange={(e) => setEmpleadoActual({...empleadoActual, fecha_egreso: e.target.value})}
                  />
                </div>
              )}

              <div className="form-botones">
                <button type="submit" className="btn-guardar">Guardar</button>
                <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Empleados;
