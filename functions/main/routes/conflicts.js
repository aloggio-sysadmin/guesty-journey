'use strict';

const { query, insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, conflictCreateSchema, conflictResolveSchema } = require('../utils/validators');

function parseConflict(row) {
  if (!row) return null;
  return {
    ...row,
    related_process_ids_json: safeParse(row.related_process_ids_json, []),
    related_gap_ids_json: safeParse(row.related_gap_ids_json, [])
  };
}

// POST /conflicts
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(conflictCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const conflict_id = await generateId(catalystApp, 'CONF');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'ConflictLog', {
    conflict_id,
    type: value.type,
    description: value.description,
    sme_a_id: value.sme_a_id,
    sme_a_version: value.sme_a_version || '',
    sme_b_id: value.sme_b_id || '',
    sme_b_version: value.sme_b_version || '',
    related_process_ids_json: safeStringify(value.related_process_ids_json || []),
    related_gap_ids_json: safeStringify(value.related_gap_ids_json || []),
    resolution_status: 'unresolved',
    resolution_notes: '',
    resolved_by: '',
    resolved_date: '',
    created_by: user ? user.user_id : '',
    created_at: now
  });

  return parseConflict(row);
}

// GET /conflicts
async function list(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM ConflictLog';
  const conditions = [];
  if (queryParams && queryParams.resolution_status) conditions.push(`resolution_status = '${queryParams.resolution_status}'`);
  if (queryParams && queryParams.type) conditions.push(`type = '${queryParams.type}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const rows = await query(catalystApp, sql);
  return rows.map(parseConflict);
}

// GET /conflicts/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'ConflictLog', 'conflict_id', params.id);
  if (!row) { const e = new Error('Conflict not found'); e.status = 404; throw e; }
  return parseConflict(row);
}

// POST /conflicts/:id/resolve
async function resolve(catalystApp, params, body, user) {
  const { error, value } = validate(conflictResolveSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'ConflictLog', 'conflict_id', params.id);
  if (!row) { const e = new Error('Conflict not found'); e.status = 404; throw e; }

  const updates = {
    resolution_status: 'resolved',
    resolution_notes: value.resolution_notes,
    resolved_by: user ? user.user_id : '',
    resolved_date: new Date().toISOString()
  };

  const updated = await update(catalystApp, 'ConflictLog', row.ROWID, updates);
  return parseConflict(updated || { ...row, ...updates });
}

module.exports = { create, list, get, resolve };
