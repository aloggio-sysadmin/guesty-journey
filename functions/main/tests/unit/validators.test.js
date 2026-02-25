'use strict';

const { validate, loginSchema, startSessionSchema, sendMessageSchema, quickActionSchema, smeCreateSchema } = require('../../utils/validators');

describe('loginSchema', () => {
  test('accepts valid credentials', () => {
    const { error, value } = validate(loginSchema, { email: 'user@test.com', password: 'pass123' });
    expect(error).toBeNull();
    expect(value.email).toBe('user@test.com');
  });

  test('rejects missing email', () => {
    const { error } = validate(loginSchema, { password: 'pass123' });
    expect(error).not.toBeNull();
  });

  test('rejects invalid email format', () => {
    const { error } = validate(loginSchema, { email: 'not-an-email', password: 'pass123' });
    expect(error).not.toBeNull();
  });

  test('rejects missing password', () => {
    const { error } = validate(loginSchema, { email: 'user@test.com' });
    expect(error).not.toBeNull();
  });
});

describe('startSessionSchema', () => {
  test('accepts sme_id only', () => {
    const { error, value } = validate(startSessionSchema, { sme_id: 'SME-001' });
    expect(error).toBeNull();
    expect(value.sme_id).toBe('SME-001');
  });

  test('accepts inline SME fields without sme_id', () => {
    const { error, value } = validate(startSessionSchema, {
      sme_name: 'Alice',
      sme_role: 'Manager',
      sme_email: 'alice@hotel.com',
      journey_stages: ['discovery']
    });
    expect(error).toBeNull();
    expect(value.sme_name).toBe('Alice');
  });

  test('accepts empty object (all optional)', () => {
    const { error } = validate(startSessionSchema, {});
    expect(error).toBeNull();
  });
});

describe('sendMessageSchema', () => {
  test('accepts valid content', () => {
    const { error, value } = validate(sendMessageSchema, { content: 'Hello' });
    expect(error).toBeNull();
    expect(value.content).toBe('Hello');
  });

  test('rejects empty content', () => {
    const { error } = validate(sendMessageSchema, { content: '' });
    expect(error).not.toBeNull();
  });

  test('rejects missing content', () => {
    const { error } = validate(sendMessageSchema, {});
    expect(error).not.toBeNull();
  });
});

describe('quickActionSchema', () => {
  const validActions = ['next', 'back', 'correct', 'done', 'pause', 'summary', 'status', 'help'];

  validActions.forEach(action => {
    test(`accepts action: ${action}`, () => {
      const { error } = validate(quickActionSchema, { action });
      expect(error).toBeNull();
    });
  });

  test('rejects unknown action', () => {
    const { error } = validate(quickActionSchema, { action: 'fly' });
    expect(error).not.toBeNull();
  });

  test('accepts correct with optional record_id', () => {
    const { error, value } = validate(quickActionSchema, { action: 'correct', record_id: 'PROC-001' });
    expect(error).toBeNull();
    expect(value.record_id).toBe('PROC-001');
  });
});

describe('smeCreateSchema', () => {
  const valid = {
    full_name: 'Alice Chen',
    role: 'Front Office Manager',
    department: 'Front Office',
    location: 'Sydney'
  };

  test('accepts valid SME', () => {
    const { error } = validate(smeCreateSchema, valid);
    expect(error).toBeNull();
  });

  test('rejects missing full_name', () => {
    const { error } = validate(smeCreateSchema, { ...valid, full_name: undefined });
    expect(error).not.toBeNull();
  });

  test('accepts with only required fields', () => {
    const { error } = validate(smeCreateSchema, { full_name: 'Bob', role: 'Manager' });
    expect(error).toBeNull();
  });
});
