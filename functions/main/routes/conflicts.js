'use strict';

const { query, insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, conflictCreateSchema, conflictResolveSchema } = require('../utils/validators');

function parseConflict(row) {
  if (!row) return null;
  return { ...row };
}

// POST /conflicts
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(conflictCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const conflict_id = await generateId(catalystApp, 'CONF');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'ConflictLog', {
    conflict_id,
    conflict_type: value.conflict_type || 'data_inconsistency',
    description: value.description,
    journey_stage: value.journey_stage || '',
    process_id: value.process_id || '',
    sme_a_id: value.sme_a_id,
    sme_b_id: value.sme_b_id || '',
    sme_a_claim: value.sme_a_claim || '',
    sme_b_claim: value.sme_b_claim || '',
    status: 'open',
    resolution_method: '',
    resolution_notes: '',
    resolved_by: '',
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  });

  return parseConflict(row);
}

// GET /conflicts
async function list(catalystApp, params, body, user, queryParams) {
  // Fetch all rows then filter in JS to avoid ZCQL column-name issues
  let rows = [];
  try {
    rows = await query(catalystApp, 'SELECT * FROM ConflictLog');
  } catch (e) {
    console.error('[conflicts] ConflictLog query failed:', e.message);
    return [];
  }

  if (queryParams) {
    if (queryParams.status) {
      rows = rows.filter(r => (r.status || r.resolution_status) === queryParams.status);
    }
    if (queryParams.resolution_status) {
      const want = queryParams.resolution_status === 'unresolved' ? ['open', 'unresolved'] : [queryParams.resolution_status];
      rows = rows.filter(r => want.includes(r.status || r.resolution_status));
    }
    if (queryParams.type || queryParams.conflict_type) {
      const t = queryParams.type || queryParams.conflict_type;
      rows = rows.filter(r => r.conflict_type === t);
    }
  }

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
    status: 'resolved',
    resolution_notes: value.resolution_notes,
    resolved_by: user ? user.user_id : '',
    resolution_method: 'manual',
    updated_at: new Date().toISOString()
  };

  const updated = await update(catalystApp, 'ConflictLog', row.ROWID, updates);
  return parseConflict(updated || { ...row, ...updates });
}

module.exports = { create, list, get, resolve };
