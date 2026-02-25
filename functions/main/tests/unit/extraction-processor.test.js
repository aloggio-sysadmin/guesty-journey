'use strict';

const { processExtractions } = require('../../services/extraction-processor');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { query } = require('../../utils/data-store');

function makeApp() {
  return createMockApp({
    store: {
      Counters: [
        { ROWID: '1', counter_name: 'SYS',  current_value: '0', prefix: 'SYS-',  padding: '3' },
        { ROWID: '2', counter_name: 'PROC', current_value: '0', prefix: 'PROC-', padding: '3' },
        { ROWID: '3', counter_name: 'GAP',  current_value: '0', prefix: 'GAP-',  padding: '3' },
        { ROWID: '4', counter_name: 'STAGE',current_value: '0', prefix: 'STAGE-',padding: '3' }
      ],
      TechEcosystem: [],
      ProcessInventory: [],
      GapRegister: [],
      JourneyMap: [],
      SMERegister: [{ ROWID: '1', sme_id: 'SME-001', full_name: 'Alice', systems_used_json: '[]', domains_json: '[]', journey_stages_owned_json: '[]' }]
    }
  });
}

describe('processExtractions — systems', () => {
  test('creates a new system when is_new=true', async () => {
    const app = makeApp();
    const extractions = {
      systems: [{ system_name: 'Opera PMS', vendor: 'Oracle', category: 'PMS', is_new: true }]
    };
    const result = await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'discovery');
    expect(result.systems).toHaveLength(1);
    expect(result.systems[0].action).toBe('created');

    const rows = await query(app, 'SELECT * FROM TechEcosystem');
    expect(rows).toHaveLength(1);
    expect(rows[0].system_name).toBe('Opera PMS');
  });

  test('updates existing system when existing_system_id provided', async () => {
    const app = makeApp();
    app._store.TechEcosystem = [{
      ROWID: '1', system_id: 'SYS-001', system_name: 'Opera PMS',
      users_json: JSON.stringify(['SME-002']),
      integration_links_json: '[]',
      source_sme_ids_json: JSON.stringify(['SME-002'])
    }];
    const extractions = {
      systems: [{ system_name: 'Opera PMS', existing_system_id: 'SYS-001', integration_with: [] }]
    };
    const result = await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'discovery');
    expect(result.systems[0].action).toBe('updated');

    const rows = await query(app, "SELECT * FROM TechEcosystem WHERE system_id = 'SYS-001'");
    const users = JSON.parse(rows[0].users_json);
    expect(users).toContain('SME-001');
    expect(users).toContain('SME-002');
  });

  test('returns empty result for null extractions', async () => {
    const app = makeApp();
    const result = await processExtractions(app, null, 'SME-001', 'SESSION-001', 'USER-001', 'discovery');
    expect(result.systems).toEqual([]);
    expect(result.processes).toEqual([]);
    expect(result.gaps).toEqual([]);
  });
});

describe('processExtractions — processes', () => {
  test('creates a new process for new steps', async () => {
    const app = makeApp();
    const extractions = {
      process_steps: [
        { description: 'Check reservation', journey_stage: 'check_in', belongs_to_process: null, sequence_number: 1 }
      ]
    };
    const result = await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'check_in');
    expect(result.processes[0].action).toBe('created');

    const rows = await query(app, 'SELECT * FROM ProcessInventory');
    expect(rows).toHaveLength(1);
    expect(rows[0].journey_stage).toBe('check_in');
  });

  test('auto-creates a GAP when as_documented differs from as_practiced', async () => {
    const app = makeApp();
    const extractions = {
      process_steps: [
        {
          description: 'Check-in step',
          journey_stage: 'check_in',
          belongs_to_process: null,
          as_documented: 'ID scan required',
          as_practiced: 'ID scan skipped for VIPs',
          sequence_number: 1
        }
      ]
    };
    const result = await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'check_in');
    const discrepancyGap = result.gaps.find(g => g.reason === 'discrepancy');
    expect(discrepancyGap).toBeDefined();

    const gaps = await query(app, 'SELECT * FROM GapRegister');
    expect(gaps.some(g => g.gap_type === 'missing_process')).toBe(true);
  });
});

describe('processExtractions — gaps', () => {
  test('creates explicit gap records', async () => {
    const app = makeApp();
    const extractions = {
      gaps: [{
        title: 'No pre-check-in communication',
        description: 'Guests not notified before arrival',
        gap_type: 'missing_process',
        root_cause: 'No automated workflow',
        frequency: 'always',
        guest_impact: 'high'
      }]
    };
    const result = await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'pre_arrival');
    expect(result.gaps[0].action).toBe('created');

    const rows = await query(app, 'SELECT * FROM GapRegister');
    expect(rows[0].title).toBe('No pre-check-in communication');
    expect(rows[0].gap_type).toBe('missing_process');
  });
});

describe('processExtractions — journey touchpoints', () => {
  test('creates a new JourneyMap stage if not exists', async () => {
    const app = makeApp();
    const extractions = {
      journey_touchpoints: [{
        touchpoint_name: 'Booking confirmation',
        journey_stage: 'discovery',
        channel: 'Email'
      }]
    };
    const result = await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'discovery');
    expect(result.touchpoints[0].action).toBe('created journey stage');

    const rows = await query(app, 'SELECT * FROM JourneyMap');
    expect(rows).toHaveLength(1);
    expect(rows[0].journey_stage).toBe('discovery');
  });

  test('merges into existing JourneyMap stage', async () => {
    const app = makeApp();
    app._store.JourneyMap = [{
      ROWID: '1',
      stage_id: 'STAGE-001',
      journey_stage: 'discovery',
      frontstage_interactions_json: JSON.stringify([{ touchpoint_name: 'OTA listing' }]),
      supporting_sme_ids_json: '[]'
    }];
    const extractions = {
      journey_touchpoints: [{ touchpoint_name: 'Direct website booking', journey_stage: 'discovery', channel: 'Web' }]
    };
    await processExtractions(app, extractions, 'SME-001', 'SESSION-001', 'USER-001', 'discovery');
    const rows = await query(app, 'SELECT * FROM JourneyMap');
    const interactions = JSON.parse(rows[0].frontstage_interactions_json);
    expect(interactions).toHaveLength(2);
  });
});
