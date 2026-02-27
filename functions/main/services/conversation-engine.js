'use strict';

const { query, insert, update, getByField, getAllByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { callClaude } = require('./claude-client');
const { buildSystemPrompt } = require('../prompts/system-prompt');
const { processExtractions } = require('./extraction-processor');
const { processConflicts } = require('./conflict-detector');
const { getConfig } = require('../config');

const MAX_HISTORY_MESSAGES = 20;

/**
 * Core pipeline: load context → call Claude → extract → save → return reply
 */
async function processMessage(catalystApp, sessionId, userMessage, userId) {
  // ── STEP 1: Load session + SME ─────────────────────────────────────────
  const session = await getByField(catalystApp, 'Sessions', 'session_id', sessionId);
  if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

  const sme = session.sme_id
    ? await getByField(catalystApp, 'SMERegister', 'sme_id', session.sme_id)
    : null;

  const conversationState = safeParse(session.conversation_state_json, {
    current_stage: 'discovery',
    topics_covered: [],
    topics_remaining: []
  });

  // ── STEP 2: Load chat history ─────────────────────────────────────────
  const chatRows = await getAllByField(catalystApp, 'ChatHistory', 'session_id', sessionId);
  chatRows.sort((a, b) => {
    const ta = a.chat_history_timestamp || '';
    const tb = b.chat_history_timestamp || '';
    return ta.localeCompare(tb);
  });

  const recent = chatRows.slice(-MAX_HISTORY_MESSAGES);
  const messages = recent.map(row => ({
    role: row.role === 'agent' ? 'assistant' : 'user',
    content: row.content || ''
  }));

  // Append current user message
  messages.push({ role: 'user', content: userMessage });

  // ── STEP 3: Load existing records for context ─────────────────────────
  const currentStage = conversationState.current_stage || 'discovery';
  const [existingSystems, existingProcesses, existingGaps] = await Promise.all([
    query(catalystApp, 'SELECT * FROM TechEcosystem'),
    query(catalystApp, `SELECT * FROM ProcessInventory WHERE journey_stage = '${currentStage}'`),
    query(catalystApp, 'SELECT * FROM GapRegister WHERE status = \'open\'')
  ]);

  // ConflictLog query is isolated — table/column may not match ZCQL expectations
  let openConflicts = [];
  if (sme) {
    try {
      const allConflicts = await query(catalystApp, 'SELECT * FROM ConflictLog');
      openConflicts = allConflicts.filter(c =>
        c.resolution_status === 'unresolved' &&
        (c.sme_a_id === sme.sme_id || c.sme_b_id === sme.sme_id)
      );
    } catch (e) {
      console.error('[conversation-engine] ConflictLog query failed (table may not exist yet):', e.message);
    }
  }

  // Load open questions from ProjectState
  let openQuestions = [];
  try {
    const config = await getConfig(catalystApp);
    const projectState = await getByField(catalystApp, 'ProjectState', 'project_id', config.PROJECT_ID);
    openQuestions = safeParse(projectState?.open_questions_json, []).filter(q => q.status === 'open');
  } catch (e) { /* non-fatal */ }

  // Compact for context window
  const existingRecords = {
    systems: existingSystems.map(s => ({
      system_id: s.system_id,
      system_name: s.system_name,
      category: s.category,
      source_sme_ids: s.source_sme_ids_json
    })),
    processes: existingProcesses.map(p => ({
      process_id: p.process_id,
      process_name: p.process_name,
      steps_summary: safeParse(p.steps_json, []).map(s => s.description).join('; ').slice(0, 200),
      source_sme_ids: p.source_sme_ids_json
    })),
    gaps: existingGaps.map(g => ({
      gap_id: g.gap_id,
      title: g.title,
      gap_type: g.gap_type
    }))
  };

  // Hydrate SME JSON fields for prompt
  const hydrateSme = sme ? {
    ...sme,
    journey_stages_owned_json: safeParse(sme.journey_stages_owned_json, []),
    domains_json: safeParse(sme.domains_json, []),
    systems_used_json: safeParse(sme.systems_used_json, [])
  } : null;

  // ── STEP 4: Build system prompt ───────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    sme: hydrateSme,
    sessionState: conversationState,
    existingRecords,
    openConflicts,
    openQuestions
  });

  // ── STEP 5: Call Claude ───────────────────────────────────────────────
  const config = await getConfig(catalystApp);
  const claudeResponse = await callClaude(systemPrompt, messages, config);

  // ── STEP 6: Process extractions ───────────────────────────────────────
  const savedRecords = await processExtractions(
    catalystApp,
    claudeResponse.extractions,
    sme ? sme.sme_id : null,
    sessionId,
    userId,
    currentStage
  );

  // ── STEP 7: Process conflicts ─────────────────────────────────────────
  const savedConflicts = await processConflicts(
    catalystApp,
    claudeResponse.conflicts_detected,
    sme ? sme.sme_id : null,
    userId
  );

  // ── STEP 8: Save open questions to ProjectState ───────────────────────
  if (claudeResponse.open_questions && claudeResponse.open_questions.length > 0) {
    await saveOpenQuestions(catalystApp, claudeResponse.open_questions, sessionId, config);
  }

  // ── STEP 9: Save both messages to ChatHistory ─────────────────────────
  const now = new Date().toISOString();

  const userMsgId = await generateId(catalystApp, 'MSG');
  await insert(catalystApp, 'ChatHistory', {
    message_id: userMsgId,
    session_id: sessionId,
    role: 'user',
    content: userMessage,
    extractions_json: '{}',
    conflicts_json: '[]',
    open_questions_json: '[]',
    conversation_state_json: '{}',
    chat_history_timestamp: now
  });

  const agentMsgId = await generateId(catalystApp, 'MSG');
  const agentTimestamp = new Date(Date.now() + 1).toISOString(); // ensure ordering
  await insert(catalystApp, 'ChatHistory', {
    message_id: agentMsgId,
    session_id: sessionId,
    role: 'agent',
    content: claudeResponse.reply || '',
    extractions_json: safeStringify(claudeResponse.extractions),
    conflicts_json: safeStringify(claudeResponse.conflicts_detected),
    open_questions_json: safeStringify(claudeResponse.open_questions),
    conversation_state_json: safeStringify(claudeResponse.conversation_state),
    chat_history_timestamp: agentTimestamp
  });

  // ── STEP 10: Update session conversation state ────────────────────────
  await update(catalystApp, 'Sessions', session.ROWID, {
    conversation_state_json: safeStringify(claudeResponse.conversation_state)
  });

  // ── STEP 11: Recalculate project state ────────────────────────────────
  try {
    const projectRoutes = require('../routes/project');
    await projectRoutes.recalculate(catalystApp);
  } catch (e) { /* non-fatal */ }

  // ── STEP 12: Return to frontend ───────────────────────────────────────
  return {
    reply: claudeResponse.reply,
    extractions: claudeResponse.extractions,
    conflicts: claudeResponse.conflicts_detected,
    open_questions: claudeResponse.open_questions,
    conversation_state: claudeResponse.conversation_state,
    saved_records: savedRecords,
    saved_conflicts: savedConflicts
  };
}

async function saveOpenQuestions(catalystApp, openQuestions, sessionId, config) {
  try {
    const projectState = await getByField(catalystApp, 'ProjectState', 'project_id', config.PROJECT_ID);
    if (!projectState) return;

    const existing = safeParse(projectState.open_questions_json, []);
    const timestamped = openQuestions.map(q => ({
      ...q,
      session_id: sessionId,
      status: 'open',
      created_at: new Date().toISOString()
    }));
    const merged = [...existing, ...timestamped];

    await update(catalystApp, 'ProjectState', projectState.ROWID, {
      open_questions_json: safeStringify(merged),
      last_updated: new Date().toISOString()
    });
  } catch (e) {
    console.error('[conversation-engine] saveOpenQuestions error:', e.message);
  }
}

module.exports = { processMessage };
