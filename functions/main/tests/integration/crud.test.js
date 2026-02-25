'use strict';

jest.mock('../../services/claude-client');

const smeRoutes = require('../../routes/sme');
const techRoutes = require('../../routes/tech');
const gapsRoutes = require('../../routes/gaps');
const journeyRoutes = require('../../routes/journey');
const conflictsRoutes = require('../../routes/conflicts');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { Counters, SMERegister, TechEcosystem, GapRegister } = require('../test-utils/fixtures');
const { query } = require('../../utils/data-store');

const adminUser = { user_id: 'USER-001', role: 'admin' };

// ConflictLog fixture aligned with actual schema (uses `resolution_status` not `status`)
const conflictFixture = [
  {
    conflict_id: 'CONF-001',
    description: 'Alice states no API; Bob states API exists.',
    type: 'system_discrepancy',
    sme_a_id: 'SME-001',
    sme_b_id: 'SME-002',
    sme_a_version: 'No API integration',
    sme_b_version: 'API exists but unconfigured',
    related_process_ids_json: '[]',
    related_gap_ids_json: '[]',
    resolution_status: 'unresolved',
    resolution_notes: '',
    resolved_by: '',
    resolved_date: '',
    created_by: 'USER-002',
    created_at: '2025-01-15T10:20:00.000Z'
  }
];

function makeApp(extra = {}) {
  return createMockApp({
    store: {
      Counters: Counters.map((c, i) => ({ ROWID: String(i + 1), ...c })),
      SMERegister: SMERegister.map((r, i) => ({ ROWID: String(i + 1), ...r })),
      TechEcosystem: TechEcosystem.map((r, i) => ({ ROWID: String(i + 1), ...r })),
      GapRegister: GapRegister.map((r, i) => ({ ROWID: String(i + 1), ...r })),
      ConflictLog: conflictFixture.map((r, i) => ({ ROWID: String(i + 1), ...r })),
      JourneyMap: [],
      ProcessInventory: [],
      Sessions: [],
      ...extra
    }
  });
}

// ── SME ─────────────────────────────────────────────────────────────────────

describe('SME CRUD', () => {
  test('creates a new SME', async () => {
    const app = makeApp();
    const result = await smeRoutes.create(app, {}, {
      full_name: 'Carol Smith',
      role: 'Housekeeping Manager',
      department: 'Housekeeping',
      location: 'Melbourne',
      journey_stages_owned_json: ['in_stay']
    }, adminUser);
    expect(result.sme_id).toMatch(/^SME-/);

    const rows = await query(app, "SELECT * FROM SMERegister WHERE full_name = 'Carol Smith'");
    expect(rows).toHaveLength(1);
  });

  test('lists all SMEs (returns array)', async () => {
    const app = makeApp();
    // sme.list returns an array directly
    const result = await smeRoutes.list(app);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test('gets a single SME by id (returns flat object with sessions)', async () => {
    const app = makeApp();
    // sme.get returns { ...sme, sessions }
    const result = await smeRoutes.get(app, { id: 'SME-001' });
    expect(result.full_name).toBe('Alice Chen');
    expect(result.sessions).toBeDefined();
  });

  test('throws 404 for unknown SME', async () => {
    const app = makeApp();
    await expect(smeRoutes.get(app, { id: 'SME-999' })).rejects.toMatchObject({ status: 404 });
  });

  test('updates SME fields', async () => {
    const app = makeApp();
    await smeRoutes.update(app, { id: 'SME-001' }, { location: 'Brisbane' }, adminUser);
    const rows = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'SME-001'");
    expect(rows[0].location).toBe('Brisbane');
  });

  test('validate sets interview_status to validated (returns SME object)', async () => {
    const app = makeApp();
    // validate returns the updated SME object
    const result = await smeRoutes.validate(app, { id: 'SME-001' }, {}, adminUser);
    expect(result.interview_status).toBe('validated');
    expect(result.validated_by_sme).toBe(true);
    const rows = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'SME-001'");
    expect(rows[0].interview_status).toBe('validated');
  });
});

// ── Tech Ecosystem ───────────────────────────────────────────────────────────

describe('TechEcosystem CRUD', () => {
  test('creates a new system', async () => {
    const app = makeApp();
    // category must be one of: PMS, CRM, Channel Manager, etc.
    const result = await techRoutes.create(app, {}, {
      system_name: 'Mews PMS',
      vendor: 'Mews',
      category: 'PMS',
      primary_owner_sme_id: 'SME-001'
    }, adminUser);
    expect(result.system_id).toMatch(/^SYS-/);
  });

  test('lists all systems (returns array)', async () => {
    const app = makeApp();
    // tech.list returns an array directly
    const result = await techRoutes.list(app);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('throws 404 for unknown system', async () => {
    const app = makeApp();
    await expect(techRoutes.get(app, { id: 'SYS-999' })).rejects.toMatchObject({ status: 404 });
  });
});

// ── Gaps ─────────────────────────────────────────────────────────────────────

describe('Gaps CRUD', () => {
  test('creates a new gap', async () => {
    const app = makeApp();
    const result = await gapsRoutes.create(app, {}, {
      title: 'Missing digital check-in',
      description: 'No mobile check-in option',
      journey_stage_id: 'check_in',
      gap_type: 'missing_process',
      guest_impact: 'high'
    }, adminUser);
    expect(result.gap_id).toMatch(/^GAP-/);
  });

  test('lists gaps with optional stage filter (returns array)', async () => {
    const app = makeApp();
    // gaps.list uses queryParams.journey_stage_id for SQL WHERE
    const result = await gapsRoutes.list(app, {}, {}, adminUser, { journey_stage_id: 'pre_arrival' });
    expect(Array.isArray(result)).toBe(true);
    expect(result.every(g => g.journey_stage_id === 'pre_arrival')).toBe(true);
  });

  test('updates a gap status', async () => {
    const app = makeApp();
    await gapsRoutes.update(app, { id: 'GAP-001' }, { status: 'in_progress' }, adminUser);
    const rows = await query(app, "SELECT * FROM GapRegister WHERE gap_id = 'GAP-001'");
    expect(rows[0].status).toBe('in_progress');
  });
});

// ── Conflicts ─────────────────────────────────────────────────────────────────

describe('Conflicts', () => {
  test('lists all conflicts (returns array)', async () => {
    const app = makeApp();
    // conflicts.list returns an array directly
    const result = await conflictsRoutes.list(app);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].conflict_id).toBe('CONF-001');
  });

  test('resolves a conflict (returns conflict object)', async () => {
    const app = makeApp();
    // resolve returns the updated conflict object
    const result = await conflictsRoutes.resolve(app, { id: 'CONF-001' }, {
      resolution_notes: 'Both SMEs agreed API exists but is unconfigured.'
    }, adminUser);
    expect(result.resolution_status).toBe('resolved');
    expect(result.resolution_notes).toContain('Both SMEs agreed');
  });

  test('throws 400 for unknown conflict when body is invalid', async () => {
    const app = makeApp();
    // conflictResolveSchema requires resolution_notes; empty body → 400
    await expect(
      conflictsRoutes.resolve(app, { id: 'CONF-999' }, {}, adminUser)
    ).rejects.toMatchObject({ status: 400 });
  });

  test('throws 404 for unknown conflict with valid body', async () => {
    const app = makeApp();
    await expect(
      conflictsRoutes.resolve(app, { id: 'CONF-999' }, { resolution_notes: 'test' }, adminUser)
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── Journey Map ──────────────────────────────────────────────────────────────

describe('JourneyMap CRUD', () => {
  test('creates a new journey stage', async () => {
    const app = makeApp();
    const result = await journeyRoutes.create(app, {}, {
      journey_stage: 'discovery',
      stage_description: 'Guest discovers the hotel'
    }, adminUser);
    expect(result.stage_id).toMatch(/^STAGE-/);
  });

  test('throws 409 if stage already exists', async () => {
    const app = makeApp();
    app._store.JourneyMap = [{ ROWID: '1', stage_id: 'STAGE-001', journey_stage: 'discovery' }];
    await expect(
      journeyRoutes.create(app, {}, { journey_stage: 'discovery' }, adminUser)
    ).rejects.toMatchObject({ status: 409 });
  });

  test('PUT merges array fields additively', async () => {
    const app = makeApp();
    app._store.JourneyMap = [{
      ROWID: '1',
      stage_id: 'STAGE-001',
      journey_stage: 'discovery',
      guest_actions_json: JSON.stringify(['Search online']),
      frontstage_interactions_json: '[]',
      backstage_processes_json: '[]',
      technology_touchpoints_json: '[]',
      failure_points_json: '[]',
      supporting_process_ids_json: '[]',
      supporting_sme_ids_json: '[]'
    }];
    await journeyRoutes.update(app, { id: 'STAGE-001' }, {
      guest_actions_json: ['Make booking']
    }, adminUser);
    const rows = await query(app, "SELECT * FROM JourneyMap WHERE stage_id = 'STAGE-001'");
    const actions = JSON.parse(rows[0].guest_actions_json);
    expect(actions).toContain('Search online');
    expect(actions).toContain('Make booking');
  });
});
