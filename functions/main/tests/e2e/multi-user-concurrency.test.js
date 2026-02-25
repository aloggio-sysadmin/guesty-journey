'use strict';

/**
 * E2E: Multi-user concurrency — verifies that multiple users can run
 * interview sessions without data leakage or ID collisions.
 *
 * Note: Sessions are started sequentially because the in-memory mock
 * lacks atomic counter increments. In production, Catalyst's Data Store
 * provides row-level locking for the Counters table.
 */

const mockClaudeClient = {
  callClaude: jest.fn(),
  callClaudeForSummary: jest.fn()
};
jest.mock('../../services/claude-client', () => mockClaudeClient);

const chatRoutes = require('../../routes/chat');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { Counters, SMERegister, Users } = require('../test-utils/fixtures');
const { OPENING_MESSAGE_RESPONSE, EXTRACTION_RESPONSE } = require('../test-utils/mock-claude');
const { query } = require('../../utils/data-store');

function makeApp() {
  return createMockApp({
    store: {
      Counters: Counters.map((c, i) => ({ ROWID: String(i + 1), ...c })),
      SMERegister: SMERegister.map((r, i) => ({ ROWID: String(i + 1), ...r })),
      Sessions: [], ChatHistory: [], TechEcosystem: [],
      ProcessInventory: [], GapRegister: [], ConflictLog: [],
      JourneyMap: [], Users: Users.map((u, i) => ({ ROWID: String(i + 1), ...u })),
      ProjectState: [], OpenQuestions: []
    }
  });
}

const user1 = { user_id: 'USER-001', email: 'admin@hotel.com', role: 'admin' };
const user2 = { user_id: 'USER-002', email: 'interviewer@hotel.com', role: 'interviewer' };

describe('Multi-User Concurrency', () => {
  beforeEach(() => jest.clearAllMocks());

  test('two sessions produce unique session IDs', async () => {
    const app = makeApp();
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);

    const r1 = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user1);
    const r2 = await chatRoutes.startSession(app, {}, { sme_id: 'SME-002' }, user2);

    expect(r1.session_id).not.toBe(r2.session_id);
    expect(r1.session_id).toMatch(/^SESSION-/);
    expect(r2.session_id).toMatch(/^SESSION-/);

    const sessions = await query(app, 'SELECT * FROM Sessions');
    expect(sessions).toHaveLength(2);
  });

  test('messages from different sessions do not cross-contaminate', async () => {
    const app = makeApp();
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);

    const r1 = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user1);
    const r2 = await chatRoutes.startSession(app, {}, { sme_id: 'SME-002' }, user2);

    await chatRoutes.sendMessage(app, { sessionId: r1.session_id }, { content: 'Message for session 1' }, user1);
    await chatRoutes.sendMessage(app, { sessionId: r2.session_id }, { content: 'Message for session 2' }, user2);

    const msgs1 = await query(app, `SELECT * FROM ChatHistory WHERE session_id = '${r1.session_id}'`);
    const msgs2 = await query(app, `SELECT * FROM ChatHistory WHERE session_id = '${r2.session_id}'`);

    expect(msgs1.every(m => m.session_id === r1.session_id)).toBe(true);
    expect(msgs2.every(m => m.session_id === r2.session_id)).toBe(true);
    expect(msgs1.length).toBeGreaterThanOrEqual(2);
    expect(msgs2.length).toBeGreaterThanOrEqual(2);
  });

  test('sequential sessions produce unique counter IDs', async () => {
    const app = makeApp();
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);

    const results = [];
    for (let i = 0; i < 5; i++) {
      const r = await chatRoutes.startSession(
        app, {}, { sme_id: i % 2 === 0 ? 'SME-001' : 'SME-002' }, user1
      );
      results.push(r);
    }

    const ids = results.map(r => r.session_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  test('resumeSession always returns correct session for correct user', async () => {
    const app = makeApp();
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);

    const r1 = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user1);
    const r2 = await chatRoutes.startSession(app, {}, { sme_id: 'SME-002' }, user2);

    await chatRoutes.sendMessage(app, { sessionId: r1.session_id }, { content: 'Session 1 content' }, user1);
    await chatRoutes.sendMessage(app, { sessionId: r2.session_id }, { content: 'Session 2 content' }, user2);

    const resumed1 = await chatRoutes.resumeSession(app, { sessionId: r1.session_id });
    const resumed2 = await chatRoutes.resumeSession(app, { sessionId: r2.session_id });

    expect(resumed1.sme.sme_id).toBe('SME-001');
    expect(resumed2.sme.sme_id).toBe('SME-002');

    const hasSession2Msg = resumed1.messages.some(m => m.content === 'Session 2 content');
    expect(hasSession2Msg).toBe(false);
  });
});
