'use strict';

const { query, insert, update, getByField, getAllByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, processCreateSchema, processUpdateSchema, gapCreateSchema } = require('../utils/validators');

function parseProcess(row) {
  if (!row) return null;
  return {
    ...row,
    supporting_sme_ids_json: safeParse(row.supporting_sme_ids_json, []),
    trigger_json: safeParse(row.trigger_json, {}),
    steps_json: safeParse(row.steps_json, []),
    handoffs_json: safeParse(row.handoffs_json, []),
    source_sme_ids_json: safeParse(row.source_sme_ids_json, [])
  };
}

async function autoCreateDiscrepancyGap(catalystApp, process, userId) {
  const gap_id = await generateId(catalystApp, 'GAP');
  const now = new Date().toISOString();
  await insert(catalystApp, 'GapRegister', {
    gap_id,
    title: `Discrepancy: ${process.process_name} — documented vs practiced`,
    description: `Documented: ${process.as_documented}. Practiced: ${process.as_practiced}.`,
    journey_stage_id: process.journey_stage || '',
    process_id: process.process_id,
    source_sme_ids_json: safeStringify(safeParse(process.source_sme_ids_json, [])),
    gap_type: 'missing_process',
    root_cause: 'Process not followed as documented',
    frequency: 'occasional',
    guest_impact: 'medium',
    business_impact: '',
    financial_impact_estimate: '',
    confirmed_by_multiple_smes: false,
    conflict_with_sme_ids_json: '[]',
    opportunity_json: '{}',
    status: 'open',
    created_by: userId || '',
    created_at: now,
    updated_at: now
  });
  return gap_id;
}

// POST /process
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(processCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const process_id = await generateId(catalystApp, 'PROC');
  const now = new Date().toISOString();

  const hasDiscrepancy = value.as_documented && value.as_practiced &&
    value.as_documented.trim() !== value.as_practiced.trim();

  const rowData = {
    process_id,
    process_name: value.process_name,
    journey_stage: value.journey_stage,
    sub_stage: value.sub_stage || '',
    owner_sme_id: value.owner_sme_id || '',
    supporting_sme_ids_json: safeStringify(value.supporting_sme_ids_json || []),
    trigger_json: safeStringify(value.trigger_json || {}),
    steps_json: safeStringify(value.steps_json || []),
    handoffs_json: safeStringify(value.handoffs_json || []),
    maturity: value.maturity || 'ad_hoc',
    as_documented: value.as_documented || '',
    as_practiced: value.as_practiced || '',
    discrepancy_flag: hasDiscrepancy,
    discrepancy_notes: hasDiscrepancy ? 'Auto-detected: documented vs practiced differ' : '',
    source_sme_ids_json: safeStringify(value.source_sme_ids_json || []),
    conflict_flag: false,
    conflict_notes: '',
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  };

  const row = await insert(catalystApp, 'ProcessInventory', rowData);
  const result = parseProcess(row);

  // Auto-create GAP if discrepancy
  if (hasDiscrepancy) {
    result.auto_gap_id = await autoCreateDiscrepancyGap(catalystApp, { ...rowData, process_id }, user ? user.user_id : '');
  }

  return result;
}

// GET /process
async function list(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM ProcessInventory';
  const conditions = [];
  if (queryParams && queryParams.journey_stage) conditions.push(`journey_stage = '${queryParams.journey_stage}'`);
  if (queryParams && queryParams.maturity) conditions.push(`maturity = '${queryParams.maturity}'`);
  if (queryParams && queryParams.owner_sme_id) conditions.push(`owner_sme_id = '${queryParams.owner_sme_id}'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const rows = await query(catalystApp, sql);
  return rows.map(parseProcess);
}

// GET /process/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'ProcessInventory', 'process_id', params.id);
  if (!row) { const e = new Error('Process not found'); e.status = 404; throw e; }
  return parseProcess(row);
}

// PUT /process/:id
async function update_process(catalystApp, params, body, user) {
  const { error, value } = validate(processUpdateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'ProcessInventory', 'process_id', params.id);
  if (!row) { const e = new Error('Process not found'); e.status = 404; throw e; }

  const updates = { updated_at: new Date().toISOString() };
  const scalarFields = ['process_name','journey_stage','sub_stage','owner_sme_id','maturity','as_documented','as_practiced'];
  for (const f of scalarFields) if (value[f] !== undefined) updates[f] = value[f];
  const jsonFields = ['supporting_sme_ids_json','trigger_json','steps_json','handoffs_json','source_sme_ids_json'];
  for (const f of jsonFields) if (value[f] !== undefined) updates[f] = safeStringify(value[f]);

  const asDoc = updates.as_documented || row.as_documented;
  const asPrac = updates.as_practiced || row.as_practiced;
  const hasDiscrepancy = asDoc && asPrac && asDoc.trim() !== asPrac.trim();
  updates.discrepancy_flag = hasDiscrepancy;
  if (hasDiscrepancy) updates.discrepancy_notes = 'Auto-detected: documented vs practiced differ';

  const updated = await update(catalystApp, 'ProcessInventory', row.ROWID, updates);
  const result = parseProcess(updated || { ...row, ...updates });

  if (hasDiscrepancy && !row.discrepancy_flag) {
    result.auto_gap_id = await autoCreateDiscrepancyGap(catalystApp, {
      ...row, ...updates,
      process_id: row.process_id,
      process_name: updates.process_name || row.process_name
    }, user ? user.user_id : '');
  }

  return result;
}

module.exports = { create, list, get, update: update_process };
