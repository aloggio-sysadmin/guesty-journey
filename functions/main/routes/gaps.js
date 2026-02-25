'use strict';

const { query, insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, gapCreateSchema, gapUpdateSchema } = require('../utils/validators');

function parseGap(row) {
  if (!row) return null;
  return {
    ...row,
    source_sme_ids_json: safeParse(row.source_sme_ids_json, []),
    conflict_with_sme_ids_json: safeParse(row.conflict_with_sme_ids_json, []),
    opportunity_json: safeParse(row.opportunity_json, {})
  };
}

// POST /gaps
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(gapCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const gap_id = await generateId(catalystApp, 'GAP');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'GapRegister', {
    gap_id,
    title: value.title,
    description: value.description || '',
    journey_stage_id: value.journey_stage_id || '',
    process_id: value.process_id || '',
    source_sme_ids_json: safeStringify(value.source_sme_ids_json || []),
    gap_type: value.gap_type || 'other',
    root_cause: value.root_cause || '',
    frequency: value.frequency || 'occasional',
    guest_impact: value.guest_impact || 'medium',
    business_impact: value.business_impact || '',
    financial_impact_estimate: value.financial_impact_estimate || '',
    confirmed_by_multiple_smes: false,
    conflict_with_sme_ids_json: '[]',
    opportunity_json: safeStringify(value.opportunity_json || {}),
    status: value.status || 'open',
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  });

  return parseGap(row);
}

// GET /gaps
async function list(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM GapRegister';
  const conditions = [];
  if (queryParams && queryParams.status) conditions.push(`status = '${queryParams.status}'`);
  if (queryParams && queryParams.guest_impact) conditions.push(`guest_impact = '${queryParams.guest_impact}'`);
  if (queryParams && queryParams.gap_type) conditions.push(`gap_type = '${queryParams.gap_type}'`);
  if (queryParams && queryParams.journey_stage_id) conditions.push(`journey_stage_id = '${queryParams.journey_stage_id}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const rows = await query(catalystApp, sql);
  return rows.map(parseGap);
}

// GET /gaps/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'GapRegister', 'gap_id', params.id);
  if (!row) { const e = new Error('Gap not found'); e.status = 404; throw e; }
  return parseGap(row);
}

// PUT /gaps/:id
async function update_gap(catalystApp, params, body, user) {
  const { error, value } = validate(gapUpdateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'GapRegister', 'gap_id', params.id);
  if (!row) { const e = new Error('Gap not found'); e.status = 404; throw e; }

  const updates = { updated_at: new Date().toISOString() };
  const scalar = ['title','description','journey_stage_id','process_id','gap_type','root_cause','frequency','guest_impact','business_impact','financial_impact_estimate','status'];
  for (const f of scalar) if (value[f] !== undefined) updates[f] = value[f];
  const jsonFields = ['source_sme_ids_json','conflict_with_sme_ids_json','opportunity_json'];
  for (const f of jsonFields) if (value[f] !== undefined) updates[f] = safeStringify(value[f]);

  const updated = await update(catalystApp, 'GapRegister', row.ROWID, updates);
  return parseGap(updated || { ...row, ...updates });
}

module.exports = { create, list, get, update: update_gap };
