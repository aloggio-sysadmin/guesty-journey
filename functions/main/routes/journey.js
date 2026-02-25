'use strict';

const { query, insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify, mergeJsonArrays } = require('../utils/json-helpers');
const { validate, journeyCreateSchema, journeyUpdateSchema } = require('../utils/validators');

const STAGE_ORDER = ['discovery','booking','pre_arrival','check_in','in_stay','check_out','post_stay','re_engagement'];

function parseJourney(row) {
  if (!row) return null;
  return {
    ...row,
    guest_actions_json: safeParse(row.guest_actions_json, []),
    frontstage_interactions_json: safeParse(row.frontstage_interactions_json, []),
    backstage_processes_json: safeParse(row.backstage_processes_json, []),
    technology_touchpoints_json: safeParse(row.technology_touchpoints_json, []),
    failure_points_json: safeParse(row.failure_points_json, []),
    supporting_process_ids_json: safeParse(row.supporting_process_ids_json, []),
    supporting_sme_ids_json: safeParse(row.supporting_sme_ids_json, [])
  };
}

// POST /journey
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(journeyCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  // Check if stage already exists
  const existing = await getByField(catalystApp, 'JourneyMap', 'journey_stage', value.journey_stage);
  if (existing) { const e = new Error(`Journey stage '${value.journey_stage}' already exists. Use PUT to update.`); e.status = 409; throw e; }

  const stage_id = await generateId(catalystApp, 'STAGE');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'JourneyMap', {
    stage_id,
    journey_stage: value.journey_stage,
    stage_description: value.stage_description || '',
    guest_actions_json: safeStringify(value.guest_actions_json || []),
    frontstage_interactions_json: safeStringify(value.frontstage_interactions_json || []),
    backstage_processes_json: safeStringify(value.backstage_processes_json || []),
    technology_touchpoints_json: safeStringify(value.technology_touchpoints_json || []),
    failure_points_json: safeStringify(value.failure_points_json || []),
    supporting_process_ids_json: safeStringify(value.supporting_process_ids_json || []),
    supporting_sme_ids_json: safeStringify(value.supporting_sme_ids_json || []),
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  });

  return parseJourney(row);
}

// GET /journey
async function list(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM JourneyMap');
  const parsed = rows.map(parseJourney);
  parsed.sort((a, b) => STAGE_ORDER.indexOf(a.journey_stage) - STAGE_ORDER.indexOf(b.journey_stage));
  return parsed;
}

// GET /journey/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'JourneyMap', 'stage_id', params.id);
  if (!row) { const e = new Error('Journey stage not found'); e.status = 404; throw e; }
  return parseJourney(row);
}

// PUT /journey/:id  (additive merge for array fields)
async function update_journey(catalystApp, params, body, user) {
  const { error, value } = validate(journeyUpdateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'JourneyMap', 'stage_id', params.id);
  if (!row) { const e = new Error('Journey stage not found'); e.status = 404; throw e; }

  const updates = { updated_at: new Date().toISOString() };
  if (value.stage_description !== undefined) updates.stage_description = value.stage_description;

  // Additive merge for array fields
  const arrayFields = ['guest_actions_json','frontstage_interactions_json','backstage_processes_json',
                       'technology_touchpoints_json','failure_points_json',
                       'supporting_process_ids_json','supporting_sme_ids_json'];
  for (const f of arrayFields) {
    if (value[f] !== undefined) {
      updates[f] = mergeJsonArrays(row[f], Array.isArray(value[f]) ? value[f] : safeParse(value[f], []));
    }
  }

  const updated = await update(catalystApp, 'JourneyMap', row.ROWID, updates);
  return parseJourney(updated || { ...row, ...updates });
}

module.exports = { create, list, get, update: update_journey };
