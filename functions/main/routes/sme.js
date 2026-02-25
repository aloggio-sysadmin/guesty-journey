'use strict';

const { query, insert, update, getByField, getAllByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, smeCreateSchema, smeUpdateSchema } = require('../utils/validators');

function parseSme(row) {
  if (!row) return null;
  return {
    ...row,
    contact_json: safeParse(row.contact_json, {}),
    domains_json: safeParse(row.domains_json, []),
    journey_stages_owned_json: safeParse(row.journey_stages_owned_json, []),
    systems_used_json: safeParse(row.systems_used_json, [])
  };
}

// POST /sme
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(smeCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const sme_id = await generateId(catalystApp, 'SME');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'SMERegister', {
    sme_id,
    full_name: value.full_name,
    role: value.role,
    department: value.department || '',
    location: value.location || '',
    contact_json: safeStringify(value.contact_json || {}),
    domains_json: safeStringify(value.domains_json || []),
    journey_stages_owned_json: safeStringify(value.journey_stages_owned_json || []),
    systems_used_json: safeStringify(value.systems_used_json || []),
    interview_status: 'pending',
    validated_by_sme: false,
    validation_date: '',
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  });

  return parseSme(row);
}

// GET /sme
async function list(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM SMERegister';
  const conditions = [];
  if (queryParams && queryParams.status) {
    conditions.push(`interview_status = '${queryParams.status}'`);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

  let rows = await query(catalystApp, sql);

  // Filter by stage (JSON LIKE check)
  if (queryParams && queryParams.stage) {
    rows = rows.filter(r => {
      const stages = safeParse(r.journey_stages_owned_json, []);
      return Array.isArray(stages) && stages.includes(queryParams.stage);
    });
  }

  return rows.map(parseSme);
}

// GET /sme/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }
  const sme = parseSme(row);
  const sessions = await getAllByField(catalystApp, 'Sessions', 'sme_id', params.id);
  return { ...sme, sessions };
}

// PUT /sme/:id
async function update_sme(catalystApp, params, body, user) {
  const { error, value } = validate(smeUpdateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const updates = { updated_at: new Date().toISOString() };
  if (value.full_name !== undefined) updates.full_name = value.full_name;
  if (value.role !== undefined) updates.role = value.role;
  if (value.department !== undefined) updates.department = value.department;
  if (value.location !== undefined) updates.location = value.location;
  if (value.contact_json !== undefined) updates.contact_json = safeStringify(value.contact_json);
  if (value.domains_json !== undefined) updates.domains_json = safeStringify(value.domains_json);
  if (value.journey_stages_owned_json !== undefined) updates.journey_stages_owned_json = safeStringify(value.journey_stages_owned_json);
  if (value.systems_used_json !== undefined) updates.systems_used_json = safeStringify(value.systems_used_json);

  const updated = await update(catalystApp, 'SMERegister', row.ROWID, updates);
  return parseSme(updated || { ...row, ...updates });
}

// POST /sme/:id/validate
async function validate_sme(catalystApp, params, body, user) {
  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const updates = {
    validated_by_sme: true,
    validation_date: new Date().toISOString(),
    interview_status: 'validated',
    updated_at: new Date().toISOString()
  };
  await update(catalystApp, 'SMERegister', row.ROWID, updates);
  return parseSme({ ...row, ...updates });
}

module.exports = { create, list, get, update: update_sme, validate: validate_sme };
