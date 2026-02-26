'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, insert, update, getByField } = require('../utils/data-store');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { getConfig } = require('../config');

const COUNTER_PREFIXES = ['SME','SESSION','MSG','SYS','PROC','STAGE','GAP','CONF','TP','Q'];

function parseProject(row) {
  if (!row) return null;
  return {
    ...row,
    completion_json: safeParse(row.completion_json, {}),
    open_questions_json: safeParse(row.open_questions_json, []),
    next_actions_json: safeParse(row.next_actions_json, [])
  };
}

function defaultCompletion() {
  return {
    smes_identified: 0, smes_interviewed: 0, smes_validated: 0,
    journey_stages_mapped: 0, journey_stages_total: 8,
    processes_documented: 0, gaps_identified: 0, gaps_resolved: 0, conflicts_open: 0
  };
}

// GET /project/state
async function getState(catalystApp) {
  const config = await getConfig(catalystApp);
  let row = await getByField(catalystApp, 'ProjectState', 'project_id', config.PROJECT_ID);
  if (!row) {
    // Create default
    row = await insert(catalystApp, 'ProjectState', {
      project_id: config.PROJECT_ID,
      company: '',
      project_start_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      completion_json: safeStringify(defaultCompletion()),
      open_questions_json: '[]',
      next_actions_json: '[]',
      agent_notes: ''
    });
  }
  return parseProject(row);
}

// POST /project/recalculate
async function recalculate(catalystApp) {
  const config = await getConfig(catalystApp);

  const [
    smeAll, smeInterviewed, smeValidated,
    journeyMapped, processes, gaps, gapsResolved, conflictsOpen
  ] = await Promise.all([
    query(catalystApp, 'SELECT * FROM SMERegister'),
    query(catalystApp, "SELECT * FROM SMERegister WHERE interview_status = 'completed' OR interview_status = 'validated'"),
    query(catalystApp, "SELECT * FROM SMERegister WHERE interview_status = 'validated'"),
    query(catalystApp, 'SELECT * FROM JourneyMap'),
    query(catalystApp, 'SELECT * FROM ProcessInventory'),
    query(catalystApp, 'SELECT * FROM GapRegister'),
    query(catalystApp, "SELECT * FROM GapRegister WHERE status = 'resolved'"),
    query(catalystApp, "SELECT * FROM ConflictLog WHERE status = 'open'")
  ]);

  const completion = {
    smes_identified: smeAll.length,
    smes_interviewed: smeInterviewed.length,
    smes_validated: smeValidated.length,
    journey_stages_mapped: journeyMapped.length,
    journey_stages_total: 8,
    processes_documented: processes.length,
    gaps_identified: gaps.length,
    gaps_resolved: gapsResolved.length,
    conflicts_open: conflictsOpen.length
  };

  let row = await getByField(catalystApp, 'ProjectState', 'project_id', config.PROJECT_ID);
  if (row) {
    await update(catalystApp, 'ProjectState', row.ROWID, {
      completion_json: safeStringify(completion),
      last_updated: new Date().toISOString()
    });
  } else {
    row = await insert(catalystApp, 'ProjectState', {
      project_id: config.PROJECT_ID,
      company: '',
      project_start_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      completion_json: safeStringify(completion),
      open_questions_json: '[]',
      next_actions_json: '[]',
      agent_notes: ''
    });
  }

  return { ...parseProject(row), completion };
}

// POST /admin/seed
async function seed(catalystApp) {
  const config = await getConfig(catalystApp);
  const results = { seeded: true, created: [] };

  // Seed counters
  const existingCounters = await query(catalystApp, 'SELECT * FROM Counters');
  const existingNames = existingCounters.map(r => r.counter_name);
  for (const prefix of COUNTER_PREFIXES) {
    if (!existingNames.includes(prefix)) {
      await insert(catalystApp, 'Counters', { counter_name: prefix, current_value: 0 });
      results.created.push(`Counter: ${prefix}`);
    }
  }

  // Seed ProjectState
  const existingState = await getByField(catalystApp, 'ProjectState', 'project_id', config.PROJECT_ID);
  if (!existingState) {
    await insert(catalystApp, 'ProjectState', {
      project_id: config.PROJECT_ID,
      company: '',
      project_start_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      completion_json: safeStringify(defaultCompletion()),
      open_questions_json: '[]',
      next_actions_json: '[]',
      agent_notes: ''
    });
    results.created.push('ProjectState');
  }

  // Seed default admin user
  const adminUsers = await query(catalystApp, "SELECT * FROM Users WHERE role = 'admin'");
  if (adminUsers.length === 0) {
    const tempPassword = crypto.randomBytes(6).toString('base64').slice(0, 8);
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const user_id = 'USR-ADMIN001';
    const now = new Date().toISOString();
    await insert(catalystApp, 'Users', {
      user_id,
      email: config.DEFAULT_ADMIN_EMAIL,
      full_name: 'Administrator',
      role: 'admin',
      password_hash,
      status: 'active',
      created_at: now,
      last_login: ''
    });
    results.admin_temp_password = tempPassword;
    results.admin_email = config.DEFAULT_ADMIN_EMAIL;
    results.created.push('Admin user');
  }

  return results;
}

module.exports = { getState, recalculate, seed };
