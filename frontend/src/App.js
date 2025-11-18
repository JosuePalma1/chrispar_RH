import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Horario from './components/Horario';
import HojaDeVida from './components/HojaDeVida';
import Nominas from './components/Nominas';
import Rubros from './components/Rubros';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/horarios" element={<Horario />} />
          <Route path="/hojas-vida" element={<HojaDeVida />} />
          <Route path="/nomina" element={<Nominas />} />
          <Route path="/rubros" element={<Rubros />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
