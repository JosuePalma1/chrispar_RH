import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import { buildFakeToken } from '../../testUtils';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
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

    global.fetch = jest.fn((url) => {
      if (url.includes('/api/empleados/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, nombres: 'Juan', apellidos: 'Pérez', cargo_id: 1, estado: 'activo' }
          ])
        });
      }
      if (url.includes('/api/cargos/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, nombre_cargo: 'Gerente' }
          ])
        });
      }
      return Promise.resolve({ ok: false });
    });

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

    global.fetch = jest.fn((url) => {
      if (url.includes('/api/empleados/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEmpleados)
        });
      }
      if (url.includes('/api/cargos/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCargos)
        });
      }
      return Promise.resolve({ ok: false });
    });

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

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Token expirado' })
      })
    );

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
  });

  test('redirects to login with invalid token', () => {
    localStorage.setItem('token', 'invalid-token');

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
