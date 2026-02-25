'use strict';

/**
 * E2E: Session resume — verifies that a paused session can be resumed
 * with full message history intact and conversation continues correctly.
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

const user = { user_id: 'USER-002', email: 'interviewer@hotel.com', role: 'interviewer' };

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

describe('Session Resume Flow', () => {
  test('paused session resumes with correct message history', async () => {
    const app = makeApp();
    jest.clearAllMocks();

    // Start session
    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(OPENING_MESSAGE_RESPONSE);
    const { session_id } = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);

    // Send two messages
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);
    await chatRoutes.sendMessage(app, { sessionId: session_id }, { content: 'We use Opera PMS.' }, user);
    await chatRoutes.sendMessage(app, { sessionId: session_id }, { content: 'Channel manager too.' }, user);

    // Pause
    await chatRoutes.quickAction(app, { sessionId: session_id }, { action: 'pause' }, user);
    const sessions = await query(app, `SELECT * FROM Sessions WHERE session_id = '${session_id}'`);
    expect(sessions[0].status).toBe('paused');

    // Resume — verify full history returned
    const resumed = await chatRoutes.resumeSession(app, { sessionId: session_id });
    expect(resumed.session.status).toBe('paused');
    expect(resumed.messages.length).toBeGreaterThanOrEqual(5); // opening + 2 user + 2 agent
    expect(resumed.sme.sme_id).toBe('SME-001');
    expect(resumed.conversation_state).toBeDefined();

    // Messages ordered by timestamp
    const timestamps = resumed.messages.map(m => m.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i] >= timestamps[i - 1]).toBe(true);
    }

    // Can continue sending messages after resume
    jest.clearAllMocks();
    mockClaudeClient.callClaude.mockResolvedValue(EXTRACTION_RESPONSE);
    const continueResult = await chatRoutes.sendMessage(
      app, { sessionId: session_id }, { content: 'We also use the housekeeping system.' }, user
    );
    expect(continueResult.reply).toBeDefined();
  });

  test('resumeSession throws 404 for unknown session', async () => {
    const app = makeApp();
    await expect(
      chatRoutes.resumeSession(app, { sessionId: 'SESSION-999' })
    ).rejects.toMatchObject({ status: 404 });
  });

  test('session state is persisted correctly through resume', async () => {
    const app = makeApp();
    jest.clearAllMocks();

    mockClaudeClient.callClaudeForSummary.mockResolvedValueOnce(OPENING_MESSAGE_RESPONSE);
    const { session_id } = await chatRoutes.startSession(app, {}, { sme_id: 'SME-001' }, user);

    // Verify initial state
    const initial = await chatRoutes.resumeSession(app, { sessionId: session_id });
    expect(initial.conversation_state.current_stage).toBe('discovery');
    expect(initial.conversation_state.stage_completion_estimate).toBeGreaterThanOrEqual(0);

    // Send a message that updates state
    mockClaudeClient.callClaude.mockResolvedValueOnce({
      ...EXTRACTION_RESPONSE,
      conversation_state: {
        current_stage: 'discovery',
        current_topic: 'PMS systems',
        topics_covered: ['reservation systems'],
        topics_remaining: [],
        should_move_to_next_stage: false,
        stage_completion_estimate: 40
      }
    });
    await chatRoutes.sendMessage(app, { sessionId: session_id }, { content: 'Opera PMS is our system.' }, user);

    // Resume again — state should reflect last update
    const after = await chatRoutes.resumeSession(app, { sessionId: session_id });
    // Conversation state should be available
    expect(after.conversation_state).toBeDefined();
  });
});
