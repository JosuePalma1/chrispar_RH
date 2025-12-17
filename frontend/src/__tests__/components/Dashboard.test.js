import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import { buildFakeToken } from '../../testUtils';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock comprehensive para todas las llamadas de la API
const mockFetchSuccess = (empleados = [], cargos = [], asistencias = [], nominas = []) => {
  return jest.fn((url) => {
    if (url.includes('/api/empleados')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(empleados),
      });
    }
    if (url.includes('/api/cargos')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(cargos),
      });
    }
    if (url.includes('/api/asistencias')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(asistencias),
      });
    }
    if (url.includes('/api/nominas')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(nominas),
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
};

describe('Dashboard Component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = originalFetch; // Restaurar fetch original
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('redirects to login if no token exists', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('renders dashboard with user information', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'Administrador', user_id: 1 });
    localStorage.setItem('token', token);

    global.fetch = mockFetchSuccess(
      [{ id: 1, nombres: 'Juan', apellidos: 'Pérez', cargo_id: 1, estado: 'activo' }],
      [{ id: 1, nombre_cargo: 'Gerente' }]
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido, Admin/i)).toBeInTheDocument();
    });
  });

  test('loads and displays employees correctly', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'Administrador', user_id: 1 });
    localStorage.setItem('token', token);

    const mockEmpleados = [
      { id: 1, nombres: 'Ana', apellidos: 'López', cargo_id: 2, estado: 'activo' },
      { id: 2, nombres: 'Carlos', apellidos: 'Ruiz', cargo_id: 3, estado: 'activo' }
    ];

    const mockCargos = [
      { id: 2, nombre_cargo: 'Analista' },
      { id: 3, nombre_cargo: 'Desarrollador' }
    ];

    global.fetch = mockFetchSuccess(mockEmpleados, mockCargos);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Analista')).toBeInTheDocument();
      expect(screen.getByText('Desarrollador')).toBeInTheDocument();
    });
  });

  test('shows error message when API fails', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'Administrador', user_id: 1 });
    localStorage.setItem('token', token);

    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: false,
        status: 500
      })
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No se pudieron cargar los empleados/i)).toBeInTheDocument();
    });
  });

  test('redirects to login on 401 unauthorized', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'Administrador', user_id: 1 });
    localStorage.setItem('token', token);

    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

    global.fetch = jest.fn((url) => {
        if (url.includes('/api/empleados/')) {
            return Promise.resolve({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Token expirado' })
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
      expect(localStorage.getItem('token')).toBeNull();
    });

    mockAlert.mockRestore();
  });

  test('shows loading state while fetching data', async () => {
    const token = buildFakeToken({ username: 'Admin', rol: 'Administrador', user_id: 1 });
    localStorage.setItem('token', token);

    global.fetch = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve([])
      }), 100))
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cargando/i)).toBeInTheDocument();
    
    // Esperar a que la carga finalice para evitar el error de handle abierto
    await waitFor(() => {
        expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('redirects to login with invalid token', async () => {
    localStorage.setItem('token', 'invalid-token');

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
        expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
