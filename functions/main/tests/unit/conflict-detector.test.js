'use strict';

const { processConflicts } = require('../../services/conflict-detector');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { query } = require('../../utils/data-store');

function makeApp() {
  return createMockApp({
    store: {
      Counters: [
        { ROWID: '1', counter_name: 'CONF', current_value: '0', prefix: 'CONF-', padding: '3' }
      ],
      ConflictLog: [],
      ProcessInventory: [
        {
          ROWID: '1', process_id: 'PROC-001', process_name: 'Check-in', journey_stage: 'check_in',
          conflict_flag: false, conflict_notes: ''
        }
      ]
    }
  });
}

// conflict-detector.js expects:
//   conflict.field                    — used to infer conflict type
//   conflict.new_value_from_current_sme / conflict.existing_value
//   conflict.existing_sme_id / conflict.existing_record_id
// It returns an array of conflict_id strings.

describe('processConflicts', () => {
  test('creates a ConflictLog entry and returns conflict_id strings', async () => {
    const app = makeApp();
    const conflictsDetected = [{
      field: 'steps_json',
      new_value_from_current_sme: 'check-in takes 5 minutes',
      existing_value: 'check-in takes 15 minutes',
      existing_sme_id: 'SME-002',
      existing_record_id: null
    }];

    const result = await processConflicts(app, conflictsDetected, 'SME-001', 'USER-001');
    expect(result).toHaveLength(1);
    expect(typeof result[0]).toBe('string'); // returns conflict_id, not an object
    expect(result[0]).toMatch(/^CONF-/);

    const logs = await query(app, 'SELECT * FROM ConflictLog');
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('process_discrepancy'); // 'step' in field name → process_discrepancy
    expect(logs[0].resolution_status).toBe('unresolved');
  });

  test('flags related ProcessInventory with conflict_flag when existing_record_id provided', async () => {
    const app = makeApp();
    const conflictsDetected = [{
      field: 'steps_json',           // 'step' → process_discrepancy
      new_value_from_current_sme: 'new steps',
      existing_value: 'old steps',
      existing_sme_id: 'SME-002',
      existing_record_id: 'PROC-001' // required for flagging to trigger
    }];

    await processConflicts(app, conflictsDetected, 'SME-001', 'USER-001');
    const proc = await query(app, "SELECT * FROM ProcessInventory WHERE process_id = 'PROC-001'");
    expect(proc[0].conflict_flag === true || proc[0].conflict_flag === 'true').toBe(true);
  });

  test('infers technology_mismatch type from field name', async () => {
    const app = makeApp();
    const conflictsDetected = [{
      field: 'system_name',
      new_value_from_current_sme: 'Opera PMS v5',
      existing_value: 'Opera PMS v4',
      existing_sme_id: 'SME-002',
      existing_record_id: null
    }];
    await processConflicts(app, conflictsDetected, 'SME-001', 'USER-001');
    const logs = await query(app, 'SELECT * FROM ConflictLog');
    expect(logs[0].type).toBe('technology_mismatch');
  });

  test('handles empty conflicts array gracefully', async () => {
    const app = makeApp();
    const result = await processConflicts(app, [], 'SME-001', 'USER-001');
    expect(result).toEqual([]);
    const logs = await query(app, 'SELECT * FROM ConflictLog');
    expect(logs).toHaveLength(0);
  });

  test('handles null conflicts gracefully', async () => {
    const app = makeApp();
    const result = await processConflicts(app, null, 'SME-001', 'USER-001');
    expect(result).toEqual([]);
  });
});
