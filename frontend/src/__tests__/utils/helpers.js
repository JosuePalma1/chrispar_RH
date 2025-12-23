// CRA treats any .js file inside __tests__ as a test file.
// This file is kept for backwards-compat in case something imports it,
// but the helpers live in a shared module.
export * from '../../testUtils';

test('test helpers module loads', async () => {
	const mod = await import('../../testUtils');
	expect(typeof mod.buildFakeToken).toBe('function');
	expect(typeof mod.decodeToken).toBe('function');
});
