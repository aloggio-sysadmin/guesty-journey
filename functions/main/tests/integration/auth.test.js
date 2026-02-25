'use strict';

jest.mock('../../services/claude-client');

const authRoutes = require('../../routes/auth');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { Counters } = require('../test-utils/fixtures');

// auth.js login checks `row.status !== 'active'`, so fixtures must use `status`
const usersWithStatus = [
  {
    user_id: 'USER-001',
    email: 'admin@hotel.com',
    password_hash: '$2b$10$JVBGA0lxGb3UpmrRxuNwMefWYnSxE2VXT8oKHWAepVTqsgfE0O1bC',
    full_name: 'System Admin',
    role: 'admin',
    status: 'active',
    last_login: '2025-01-15T08:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z'
  },
  {
    user_id: 'USER-002',
    email: 'interviewer@hotel.com',
    password_hash: '$2b$10$JVBGA0lxGb3UpmrRxuNwMefWYnSxE2VXT8oKHWAepVTqsgfE0O1bC',
    full_name: 'Jane Interviewer',
    role: 'interviewer',
    status: 'active',
    last_login: null,
    created_at: '2025-01-05T00:00:00.000Z'
  }
];

function makeApp() {
  return createMockApp({
    store: {
      Users: usersWithStatus.map((u, i) => ({ ROWID: String(i + 1), ...u })),
      Counters: Counters.map((c, i) => ({ ROWID: String(i + 1), ...c }))
    }
  });
}

describe('auth — login', () => {
  test('returns token for valid admin credentials', async () => {
    const app = makeApp();
    const result = await authRoutes.login(app, {}, {
      email: 'admin@hotel.com',
      password: 'password123'
    });
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('admin@hotel.com');
    expect(result.user.role).toBe('admin');
    expect(result.user.password_hash).toBeUndefined();
  });

  test('throws 401 for wrong password', async () => {
    const app = makeApp();
    await expect(
      authRoutes.login(app, {}, { email: 'admin@hotel.com', password: 'wrongpass' })
    ).rejects.toMatchObject({ status: 401 });
  });

  test('throws 401 for unknown email', async () => {
    const app = makeApp();
    await expect(
      authRoutes.login(app, {}, { email: 'nobody@test.com', password: 'password123' })
    ).rejects.toMatchObject({ status: 401 });
  });

  test('throws 401 for inactive user (status != active)', async () => {
    const app = makeApp();
    app._store.Users[1].status = 'inactive';
    await expect(
      authRoutes.login(app, {}, { email: 'interviewer@hotel.com', password: 'password123' })
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe('auth — register', () => {
  const adminUser = { user_id: 'USER-001', email: 'admin@hotel.com', role: 'admin' };

  test('creates a new user and returns temp password', async () => {
    const app = makeApp();
    const result = await authRoutes.register(app, {}, {
      full_name: 'New User',
      email: 'new@hotel.com',
      role: 'interviewer'
    }, adminUser);

    expect(result.user_id).toBeDefined();
    expect(result.temp_password).toBeDefined();
    expect(result.temp_password.length).toBeGreaterThanOrEqual(8);

    const stored = app._store.Users.find(u => u.email === 'new@hotel.com');
    expect(stored).toBeDefined();
    expect(stored.password_hash).toBeDefined();
    expect(stored.password_hash).not.toBe(result.temp_password);
  });

  test('throws 409 for duplicate email', async () => {
    const app = makeApp();
    // role must be 'admin' or 'interviewer' per registerSchema
    await expect(
      authRoutes.register(app, {}, { full_name: 'Dup', email: 'admin@hotel.com', role: 'admin' }, adminUser)
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('auth — listUsers', () => {
  test('returns array without password hashes', async () => {
    const app = makeApp();
    // listUsers returns array directly (not { users: [...] })
    const result = await authRoutes.listUsers(app);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    result.forEach(u => {
      expect(u.password_hash).toBeUndefined();
    });
  });
});

describe('auth — updateUser', () => {
  const adminUser = { user_id: 'USER-001', email: 'admin@hotel.com', role: 'admin' };

  test('updates full_name and returns user object', async () => {
    const app = makeApp();
    // updateUser returns the updated user object
    const result = await authRoutes.updateUser(app, { id: 'USER-002' }, { full_name: 'Jane Updated' }, adminUser);
    expect(result.full_name).toBe('Jane Updated');
    expect(result.password_hash).toBeUndefined(); // stripped
  });

  test('password_reset generates new temp password', async () => {
    const app = makeApp();
    const result = await authRoutes.updateUser(app, { id: 'USER-002' }, { password_reset: true }, adminUser);
    expect(result.temp_password).toBeDefined();
    expect(result.temp_password.length).toBeGreaterThanOrEqual(8);
  });

  test('throws 404 for unknown user_id', async () => {
    const app = makeApp();
    await expect(
      authRoutes.updateUser(app, { id: 'USER-999' }, { full_name: 'X' }, adminUser)
    ).rejects.toMatchObject({ status: 404 });
  });
});
