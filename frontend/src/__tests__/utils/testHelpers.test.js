import { buildFakeToken, decodeToken, mockFetchSuccess, mockFetchError, setupAuthHeaders } from '../../testUtils';

describe('Test Helper Utilities', () => {
  describe('buildFakeToken', () => {
    test('creates a valid JWT-like token', () => {
      const token = buildFakeToken({ username: 'testuser', rol: 'admin', user_id: 1 });
      
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    test('encodes user data correctly', () => {
      const userData = { username: 'admin', rol: 'Administrador', user_id: 1 };
      const token = buildFakeToken(userData);
      const decoded = decodeToken(token);
      
      expect(decoded).toEqual(userData);
    });
  });

  describe('decodeToken', () => {
    test('decodes valid token correctly', () => {
      const token = buildFakeToken({ username: 'user1', rol: 'Empleado', user_id: 5 });
      const decoded = decodeToken(token);
      
      expect(decoded.username).toBe('user1');
      expect(decoded.rol).toBe('Empleado');
      expect(decoded.user_id).toBe(5);
    });

    test('returns null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      
      expect(decoded).toBeNull();
    });
  });

  describe('mockFetchSuccess', () => {
    test('creates successful fetch response', async () => {
      const mockData = { id: 1, name: 'Test' };
      const response = await mockFetchSuccess(mockData);
      
      expect(response.ok).toBe(true);
      expect(await response.json()).toEqual(mockData);
    });
  });

  describe('mockFetchError', () => {
    test('creates error fetch response with default status', async () => {
      const response = await mockFetchError();
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    test('creates error fetch response with custom status', async () => {
      const response = await mockFetchError(404, { error: 'Not found' });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
    });
  });

  describe('setupAuthHeaders', () => {
    test('creates correct authorization headers', () => {
      const token = 'fake-jwt-token';
      const headers = setupAuthHeaders(token);
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-jwt-token',
      });
    });
  });
});
