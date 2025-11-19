import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Horario from './components/Horario';
import HojaDeVida from './components/HojaDeVida';
import Nominas from './components/Nominas';
import Rubros from './components/Rubros';
import Cargos from './components/Cargos';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/horarios" element={<ProtectedRoute><Horario /></ProtectedRoute>} />
          <Route path="/hojas-vida" element={<ProtectedRoute><HojaDeVida /></ProtectedRoute>} />
          <Route path="/nomina" element={<ProtectedRoute><Nominas /></ProtectedRoute>} />
          <Route path="/rubros" element={<ProtectedRoute><Rubros /></ProtectedRoute>} />
          <Route path="/cargos" element={<ProtectedRoute><Cargos /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
