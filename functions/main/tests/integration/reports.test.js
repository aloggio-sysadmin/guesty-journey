'use strict';

const mockClaudeClient = {
  callClaude: jest.fn(),
  callClaudeForSummary: jest.fn()
};
jest.mock('../../services/claude-client', () => mockClaudeClient);

const reportsRoutes = require('../../routes/reports');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { fullStore } = require('../test-utils/fixtures');
const { EXECUTIVE_SUMMARY_RESPONSE } = require('../test-utils/mock-claude');

function makeApp() {
  return createMockApp({ store: fullStore() });
}

describe('reports — journey-map', () => {
  test('returns all journey stages', async () => {
    const app = makeApp();
    const result = await reportsRoutes.journeyMap(app);
    expect(result.report).toBe('journey-map');
    expect(result.stages).toHaveLength(1);
    expect(result.stages[0].journey_stage).toBe('discovery');
  });

  test('parses JSON array fields', async () => {
    const app = makeApp();
    const result = await reportsRoutes.journeyMap(app);
    const stage = result.stages[0];
    expect(Array.isArray(stage.guest_actions_json)).toBe(true);
    expect(Array.isArray(stage.frontstage_interactions_json)).toBe(true);
  });

  test('returns empty stages array when no data', async () => {
    const app = createMockApp({ store: { JourneyMap: [] } });
    const result = await reportsRoutes.journeyMap(app);
    expect(result.stages).toEqual([]);
  });
});

describe('reports — process-inventory', () => {
  test('returns all processes with statistics', async () => {
    const app = makeApp();
    const result = await reportsRoutes.processInventory(app);
    expect(result.report).toBe('process-inventory');
    expect(result.process_count).toBe(1);
    expect(result.discrepancy_count).toBe(0);
    expect(result.maturity_breakdown).toBeDefined();
  });

  test('counts discrepancies correctly', async () => {
    const app = makeApp();
    app._store.ProcessInventory[0].discrepancy_flag = true;
    const result = await reportsRoutes.processInventory(app);
    expect(result.discrepancy_count).toBe(1);
  });
});

describe('reports — tech-ecosystem', () => {
  test('returns systems with statistics', async () => {
    const app = makeApp();
    const result = await reportsRoutes.techEcosystem(app);
    expect(result.report).toBe('tech-ecosystem');
    expect(result.system_count).toBe(1);
    expect(result.category_breakdown['Property Management']).toBe(1);
  });

  test('counts integration links', async () => {
    const app = makeApp();
    const result = await reportsRoutes.techEcosystem(app);
    expect(result.total_integration_links).toBe(1);
  });
});

describe('reports — gap-opportunity', () => {
  test('returns gaps with status and impact breakdowns', async () => {
    const app = makeApp();
    const result = await reportsRoutes.gapOpportunity(app);
    expect(result.report).toBe('gap-opportunity');
    expect(result.gap_count).toBe(1);
    expect(result.status_breakdown.open).toBe(1);
    expect(result.impact_breakdown.high).toBe(1);
  });
});

describe('reports — conflict-resolution', () => {
  test('returns conflicts with status summary', async () => {
    const app = makeApp();
    const result = await reportsRoutes.conflictResolution(app);
    expect(result.report).toBe('conflict-resolution');
    expect(result.conflict_count).toBe(1);
    expect(result.open_count).toBe(1);
    expect(result.resolved_count).toBe(0);
  });
});

describe('reports — executive-summary', () => {
  test('returns AI-generated summary', async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(EXECUTIVE_SUMMARY_RESPONSE);
    const app = makeApp();
    const result = await reportsRoutes.executiveSummary(app);
    expect(result.report).toBe('executive-summary');
    expect(result.summary).toContain('Executive Summary');
    expect(result.statistics.sme_count).toBeGreaterThanOrEqual(0);
  });

  test('falls back to plain summary on Claude error', async () => {
    mockClaudeClient.callClaudeForSummary.mockRejectedValue(new Error('API error'));
    const app = makeApp();
    const result = await reportsRoutes.executiveSummary(app);
    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });
});

describe('reports — generate dispatcher', () => {
  test('dispatches journey-map correctly', async () => {
    const app = makeApp();
    const result = await reportsRoutes.generate(app, { type: 'journey-map' });
    expect(result.report).toBe('journey-map');
  });

  test('dispatches gap-opportunity correctly', async () => {
    const app = makeApp();
    const result = await reportsRoutes.generate(app, { type: 'gap-opportunity' });
    expect(result.report).toBe('gap-opportunity');
  });

  test('throws 400 for unknown report type', async () => {
    const app = makeApp();
    await expect(
      reportsRoutes.generate(app, { type: 'made-up-report' })
    ).rejects.toMatchObject({ status: 400 });
  });
});
