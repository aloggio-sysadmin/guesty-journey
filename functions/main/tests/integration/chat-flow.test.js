'use strict';

const mockClaudeClient = {
  callClaude: jest.fn(),
  callClaudeForSummary: jest.fn()
};
jest.mock('../../services/claude-client', () => mockClaudeClient);

const chatRoutes = require('../../routes/chat');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { SMERegister, Counters, Users } = require('../test-utils/fixtures');
const { OPENING_MESSAGE_RESPONSE, EXTRACTION_RESPONSE, GAP_RESPONSE, SESSION_SUMMARY_RESPONSE } = require('../test-utils/mock-claude');
const { query } = require('../../utils/data-store');

const user = { user_id: 'USER-002', email: 'interviewer@hotel.com', role: 'interviewer' };

function makeApp() {
  return createMockApp({
    store: {
      Counters: Counters.map((c, i) => ({ ROWID: String(i + 1), ...c })),
      SMERegister: SMERegister.map((r, i) => ({ ROWID: String(i + 1), ...r })),
      Sessions: [],
      ChatHistory: [],
      TechEcosystem: [],
      ProcessInventory: [],
      GapRegister: [],
      ConflictLog: [],
      JourneyMap: [],
      Users: Users.map((u, i) => ({ ROWID: String(i + 1), ...u })),
      ProjectState: [],
      OpenQuestions: []
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chat — startSession', () => {
  test('creates session and returns opening message', async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);

    const app = makeApp();
    const result = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);

    expect(result.session_id).toMatch(/^SESSION-/);
    expect(result.opening_message).toBe(OPENING_MESSAGE_RESPONSE.reply);
    expect(result.sme.sme_id).toBe('SME-001');

    // Verify session was stored
    const sessions = await query(app, 'SELECT * FROM Sessions');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].status).toBe('active');

    // Verify opening message was stored in ChatHistory
    const msgs = await query(app, 'SELECT * FROM ChatHistory');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('agent');
  });

  test('creates inline SME if no sme_id provided', async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);

    const app = makeApp();
    const result = await chatRoutes.startSession(app, {}, {
      sme_name: 'New SME',
      sme_role: 'Manager',
      sme_email: 'new@hotel.com',
      journey_stages: ['discovery']
    }, user);

    expect(result.session_id).toBeDefined();
    // New SME should be in store
    const smes = await query(app, "SELECT * FROM SMERegister WHERE full_name = 'New SME'");
    expect(smes).toHaveLength(1);
  });

  test('throws 404 for unknown sme_id', async () => {
    const app = makeApp();
    await expect(
      chatRoutes.startSession(app, {}, { sme_id: 'SME-999' }, user)
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('chat — sendMessage', () => {
  let app, sessionId;

  beforeEach(async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(OPENING_MESSAGE_RESPONSE);
    app = makeApp();
    const startResult = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);
    sessionId = startResult.session_id;
    jest.clearAllMocks();
  });

  test('processes user message and stores exchange', async () => {
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);

    const result = await chatRoutes.sendMessage(app, { sessionId }, { content: 'We use Opera PMS.' }, user);
    expect(result.reply).toBe(EXTRACTION_RESPONSE.reply);

    // Both user and agent messages stored
    const msgs = await query(app, 'SELECT * FROM ChatHistory');
    const userMsgs = msgs.filter(m => m.role === 'user');
    const agentMsgs = msgs.filter(m => m.role === 'agent');
    expect(userMsgs).toHaveLength(1);
    expect(agentMsgs).toHaveLength(2); // opening + response
  });

  test('extracts systems from Claude response', async () => {
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);

    await chatRoutes.sendMessage(app, { sessionId }, { content: 'We use Opera PMS.' }, user);
    const systems = await query(app, 'SELECT * FROM TechEcosystem');
    expect(systems).toHaveLength(1);
    expect(systems[0].system_name).toBe('Opera PMS');
  });

  test('extracts gaps from Claude response', async () => {
    mockClaudeClient.callClaude.mockResolvedValue(GAP_RESPONSE);

    await chatRoutes.sendMessage(app, { sessionId }, { content: 'Staff manually copy data.' }, user);
    const gaps = await query(app, 'SELECT * FROM GapRegister');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].gap_type).toBe('missing_integration');
  });

  test('throws 404 for unknown session', async () => {
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);
    await expect(
      chatRoutes.sendMessage(app, { sessionId: 'SESSION-999' }, { content: 'hello' }, user)
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('chat — listSessions', () => {
  test('returns list of sessions', async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);
    const app = makeApp();
    await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);
    await chatRoutes.startSession(app, {}, { sme_id: 'SME-002' }, user);

    const list = await chatRoutes.listSessions(app);
    expect(list).toHaveLength(2);
    list.forEach(s => {
      expect(s.session_id).toBeDefined();
      expect(s.sme_name).toBeDefined();
    });
  });
});

describe('chat — resumeSession', () => {
  test('returns session with message history', async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(OPENING_MESSAGE_RESPONSE);
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);
    const app = makeApp();
    const { session_id } = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);
    await chatRoutes.sendMessage(app, { sessionId: session_id }, { content: 'We use Opera.' }, user);

    const resumed = await chatRoutes.resumeSession(app, { sessionId: session_id });
    expect(resumed.session.session_id).toBe(session_id);
    expect(resumed.messages.length).toBeGreaterThanOrEqual(2);
    expect(resumed.sme.sme_id).toBe('SME-001');
  });
});

describe('chat — quickAction', () => {
  let app, sessionId;

  beforeEach(async () => {
    mockClaudeClient.callClaudeForSummary.mockResolvedValue(OPENING_MESSAGE_RESPONSE);
    app = makeApp();
    const r = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);
    sessionId = r.session_id;
    jest.clearAllMocks();
  });

  test('action: pause sets session status to paused', async () => {
    const result = await chatRoutes.quickAction(app, { sessionId }, { action: 'pause' }, user);
    expect(result.status).toBe('paused');
    const sessions = await query(app, `SELECT * FROM Sessions WHERE session_id = '${sessionId}'`);
    expect(sessions[0].status).toBe('paused');
  });

  test('action: summary returns extraction counts', async () => {
    const result = await chatRoutes.quickAction(app, { sessionId }, { action: 'summary' }, user);
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.message_count).toBe('number');
  });

  test('action: help returns commands list', async () => {
    const result = await chatRoutes.quickAction(app, { sessionId }, { action: 'help' }, user);
    expect(Array.isArray(result.commands)).toBe(true);
    expect(result.commands.length).toBeGreaterThan(0);
  });

  test('action: next sends COMMAND:NEXT message', async () => {
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);
    const result = await chatRoutes.quickAction(app, { sessionId }, { action: 'next' }, user);
    expect(result.reply).toBeDefined();
  });
});

describe('chat — closeSession', () => {
  test('closes session and generates summary', async () => {
    mockClaudeClient.callClaudeForSummary
      .mockResolvedValueOnce(OPENING_MESSAGE_RESPONSE)
      .mockResolvedValueOnce(SESSION_SUMMARY_RESPONSE);
    const app = makeApp();
    const { session_id } = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);
    app._store.ProjectState = [];

    const result = await chatRoutes.closeSession(app, { sessionId: session_id }, {}, user);
    expect(result.summary).toBeDefined();
    expect(result.records_created_counts).toBeDefined();
    expect(typeof result.duration_minutes).toBe('number');

    const sessions = await query(app, `SELECT * FROM Sessions WHERE session_id = '${session_id}'`);
    expect(sessions[0].status).toBe('closed');
  });
});
