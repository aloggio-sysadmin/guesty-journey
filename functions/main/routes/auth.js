'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { parse: csvParse } = require('csv-parse/sync');

const { query, insert, update, getByField } = require('../utils/data-store');
const { validate, loginSchema, registerSchema, bulkImportSchema } = require('../utils/validators');
const { getConfig } = require('../config');

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
async function login(catalystApp, params, body) {
  const { error, value } = validate(loginSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const { email, password } = value;
  const row = await getByField(catalystApp, 'Users', 'email', email);
  if (!row || row.status !== 'active') {
    const e = new Error('Invalid credentials'); e.status = 401; throw e;
  }

  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) { const e = new Error('Invalid credentials'); e.status = 401; throw e; }

  const config = await getConfig(catalystApp);
  const token = jwt.sign(
    { user_id: row.user_id, email: row.email, role: row.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY }
  );

  // Update last_login
  try {
    await update(catalystApp, 'Users', row.ROWID, { last_login: new Date().toISOString() });
  } catch (e) { /* non-fatal */ }

  return {
    token,
    user: { user_id: row.user_id, email: row.email, full_name: row.full_name, role: row.role }
  };
}

// ---------------------------------------------------------------------------
// POST /auth/register  [admin]
// ---------------------------------------------------------------------------
async function register(catalystApp, params, body) {
  const { error, value } = validate(registerSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const { email, full_name, role } = value;

  // Check uniqueness
  const existing = await getByField(catalystApp, 'Users', 'email', email);
  if (existing) { const e = new Error('Email already registered'); e.status = 409; throw e; }

  const tempPassword = crypto.randomBytes(6).toString('base64').slice(0, 8);
  const password_hash = await bcrypt.hash(tempPassword, 10);
  const user_id = 'USR-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const now = new Date().toISOString();

  await insert(catalystApp, 'Users', {
    user_id, email, full_name, role,
    password_hash, status: 'active',
    created_at: now, last_login: ''
  });

  return { user_id, email, full_name, role, temp_password: tempPassword };
}

// ---------------------------------------------------------------------------
// POST /auth/bulk-import  [admin]
// ---------------------------------------------------------------------------
async function bulkImport(catalystApp, params, body) {
  const { error, value } = validate(bulkImportSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  let records;
  try {
    records = csvParse(value.csv, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e) {
    const err = new Error('Invalid CSV format: ' + e.message); err.status = 400; throw err;
  }

  const imported = [];
  const errors = [];

  for (const rec of records) {
    const email = (rec.email || '').trim();
    const full_name = (rec.full_name || rec.name || '').trim();
    const role = (rec.role || 'interviewer').trim();

    if (!email || !full_name) {
      errors.push({ row: rec, reason: 'Missing email or full_name' });
      continue;
    }

    try {
      const existing = await getByField(catalystApp, 'Users', 'email', email);
      if (existing) {
        errors.push({ email, reason: 'Email already registered' });
        continue;
      }
      const tempPassword = crypto.randomBytes(6).toString('base64').slice(0, 8);
      const password_hash = await bcrypt.hash(tempPassword, 10);
      const user_id = 'USR-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      const now = new Date().toISOString();
      await insert(catalystApp, 'Users', {
        user_id, email, full_name, role,
        password_hash, status: 'active',
        created_at: now, last_login: ''
      });
      imported.push({ email, full_name, role, temp_password: tempPassword });
    } catch (e) {
      errors.push({ email, reason: e.message });
    }
  }

  return { imported: imported.length, users: imported, errors };
}

// ---------------------------------------------------------------------------
// GET /auth/users  [admin]
// ---------------------------------------------------------------------------
async function listUsers(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM Users ORDER BY created_at DESC');
  return rows.map(stripHash);
}

// ---------------------------------------------------------------------------
// PUT /auth/users/:id  [admin]
// ---------------------------------------------------------------------------
async function updateUser(catalystApp, params, body) {
  const { id } = params;
  const row = await getByField(catalystApp, 'Users', 'user_id', id);
  if (!row) { const e = new Error('User not found'); e.status = 404; throw e; }

  const updates = {};
  if (body.full_name) updates.full_name = body.full_name;
  if (body.role) updates.role = body.role;
  if (body.status) updates.status = body.status;

  let tempPassword;
  if (body.password_reset) {
    tempPassword = crypto.randomBytes(6).toString('base64').slice(0, 8);
    updates.password_hash = await bcrypt.hash(tempPassword, 10);
  }

  const updated = await update(catalystApp, 'Users', row.ROWID, updates);
  const result = stripHash(updated || { ...row, ...updates });
  if (tempPassword) result.temp_password = tempPassword;
  return result;
}

function stripHash(row) {
  const { password_hash, ...rest } = row;
  return rest;
}

module.exports = { login, register, bulkImport, listUsers, updateUser };
