'use strict';

/**
 * E2E: Complete interview flow from session start through close.
 * Simulates a full SME interview with extraction, conflict detection, and summary.
 */

const mockClaudeClient = {
  callClaude: jest.fn(),
  callClaudeForSummary: jest.fn()
};
jest.mock('../../services/claude-client', () => mockClaudeClient);

const chatRoutes = require('../../routes/chat');
const reportsRoutes = require('../../routes/reports');
const { createMockApp } = require('../test-utils/mock-catalyst');
const { Counters, SMERegister, Users } = require('../test-utils/fixtures');
const {
  OPENING_MESSAGE_RESPONSE,
  EXTRACTION_RESPONSE,
  GAP_RESPONSE,
  CONFLICT_RESPONSE,
  STAGE_COMPLETE_RESPONSE,
  SESSION_SUMMARY_RESPONSE,
  EXECUTIVE_SUMMARY_RESPONSE
} = require('../test-utils/mock-claude');
const { query } = require('../../utils/data-store');

const interviewer = { user_id: 'USER-002', email: 'interviewer@hotel.com', role: 'interviewer' };

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

describe('Full Interview Flow', () => {
  let app, sessionId;

  beforeEach(async () => {
    app = makeApp();
    jest.clearAllMocks();

    // Step 1: Start session — Claude sends opening message
    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(OPENING_MESSAGE_RESPONSE);
    const startResult = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, interviewer);
    sessionId = startResult.session_id;
  });

  test('complete flow: start → extract → gap → conflict → close', async () => {
    // Step 2: SME describes their systems → extraction
    mockClaudeClient.callClaude.mockResolvedValueOnce(EXTRACTION_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'We use Opera PMS for reservations.' }, interviewer);

    // Step 3: SME describes a gap
    mockClaudeClient.callClaude.mockResolvedValueOnce(GAP_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'Staff manually copy F&B data.' }, interviewer);

    // Step 4: Conflict detected
    mockClaudeClient.callClaude.mockResolvedValueOnce(CONFLICT_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'I think the F&B system has no API.' }, interviewer);

    // Step 5: Stage complete signal
    mockClaudeClient.callClaude.mockResolvedValueOnce(STAGE_COMPLETE_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'That covers everything for pre-arrival.' }, interviewer);

    // Step 6: Close session
    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(SESSION_SUMMARY_RESPONSE);
    const closeResult = await chatRoutes.closeSession(app, { sessionId }, {}, interviewer);

    // Verify session closed
    const sessions = await query(app, `SELECT * FROM Sessions WHERE session_id = '${sessionId}'`);
    expect(sessions[0].status).toBe('closed');
    expect(closeResult.summary).toBeDefined();

    // Verify extractions
    const systems = await query(app, 'SELECT * FROM TechEcosystem');
    expect(systems.length).toBeGreaterThanOrEqual(1);
    expect(systems.some(s => s.system_name === 'Opera PMS')).toBe(true);

    const gaps = await query(app, 'SELECT * FROM GapRegister');
    expect(gaps.length).toBeGreaterThanOrEqual(1);

    const conflicts = await query(app, 'SELECT * FROM ConflictLog');
    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    // Verify SME status updated
    const smes = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'SME-001'");
    expect(['completed', 'validated']).toContain(smes[0].interview_status);

    // Verify message count
    const messages = await query(app, `SELECT * FROM ChatHistory WHERE session_id = '${sessionId}'`);
    expect(messages.length).toBeGreaterThanOrEqual(6); // opening + 4 user + 4 agent
  });

  test('records_created_counts reflects extractions', async () => {
    mockClaudeClient.callClaude.mockResolvedValueOnce(EXTRACTION_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'We use Opera PMS.' }, interviewer);

    mockClaudeClient.callClaude.mockResolvedValueOnce(GAP_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'Manual copy.' }, interviewer);

    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(SESSION_SUMMARY_RESPONSE);
    const closeResult = await chatRoutes.closeSession(app, { sessionId }, {}, interviewer);

    expect(closeResult.records_created_counts.systems).toBeGreaterThanOrEqual(1);
    expect(closeResult.records_created_counts.gaps).toBeGreaterThanOrEqual(1);
  });

  test('executive summary report after full flow', async () => {
    mockClaudeClient.callClaude.mockResolvedValueOnce(EXTRACTION_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId }, { content: 'Opera PMS is our core system.' }, interviewer);

    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(SESSION_SUMMARY_RESPONSE);
    await chatRoutes.closeSession(app, { sessionId }, {}, interviewer);

    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(EXECUTIVE_SUMMARY_RESPONSE);
    const report = await reportsRoutes.executiveSummary(app);
    expect(report.statistics.sme_count).toBeGreaterThanOrEqual(0);
    expect(report.summary).toBeDefined();
  });
});
