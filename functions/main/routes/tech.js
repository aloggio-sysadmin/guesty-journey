'use strict';

const { query, insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, techCreateSchema, techUpdateSchema } = require('../utils/validators');

function parseTech(row) {
  if (!row) return null;
  return {
    ...row,
    users_json: safeParse(row.users_json, []),
    integration_links_json: safeParse(row.integration_links_json, []),
    manual_workarounds_json: safeParse(row.manual_workarounds_json, []),
    source_sme_ids_json: safeParse(row.source_sme_ids_json, [])
  };
}

// POST /tech
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(techCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const system_id = await generateId(catalystApp, 'SYS');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'TechEcosystem', {
    system_id,
    system_name: value.system_name,
    vendor: value.vendor || '',
    category: value.category,
    primary_owner_sme_id: value.primary_owner_sme_id || '',
    users_json: safeStringify(value.users_json || []),
    environment: value.environment || 'production',
    integration_links_json: safeStringify(value.integration_links_json || []),
    manual_workarounds_json: safeStringify(value.manual_workarounds_json || []),
    source_sme_ids_json: safeStringify(value.source_sme_ids_json || []),
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  });

  return parseTech(row);
}

// GET /tech
async function list(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM TechEcosystem';
  const conditions = [];
  if (queryParams && queryParams.category) conditions.push(`category = '${queryParams.category}'`);
  if (queryParams && queryParams.environment) conditions.push(`environment = '${queryParams.environment}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const rows = await query(catalystApp, sql);
  return rows.map(parseTech);
}

// GET /tech/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'TechEcosystem', 'system_id', params.id);
  if (!row) { const e = new Error('System not found'); e.status = 404; throw e; }
  return parseTech(row);
}

// PUT /tech/:id
async function update_tech(catalystApp, params, body, user) {
  const { error, value } = validate(techUpdateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'TechEcosystem', 'system_id', params.id);
  if (!row) { const e = new Error('System not found'); e.status = 404; throw e; }

  const updates = { updated_at: new Date().toISOString() };
  const fields = ['system_name','vendor','category','environment','primary_owner_sme_id'];
  for (const f of fields) if (value[f] !== undefined) updates[f] = value[f];
  const jsonFields = ['users_json','integration_links_json','manual_workarounds_json','source_sme_ids_json'];
  for (const f of jsonFields) if (value[f] !== undefined) updates[f] = safeStringify(value[f]);

  const updated = await update(catalystApp, 'TechEcosystem', row.ROWID, updates);
  return parseTech(updated || { ...row, ...updates });
}

module.exports = { create, list, get, update: update_tech };
