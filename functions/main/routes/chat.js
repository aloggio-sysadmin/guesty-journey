'use strict';

const { query, insert, update, deleteRow, getByField, getAllByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, startSessionSchema, sendMessageSchema, quickActionSchema, smeSessionStartSchema, smeSessionMessageSchema } = require('../utils/validators');
const { verifySmeToken } = require('../middleware/auth');
const { processMessage } = require('../services/conversation-engine');
const { callClaudeForSummary } = require('../services/claude-client');
const { buildSystemPrompt } = require('../prompts/system-prompt');
const { getConfig } = require('../config');
const { getJourney, getFirstStage } = require('../config/journeys');

// POST /chat/start
async function startSession(catalystApp, params, body, user) {
  const { error, value } = validate(startSessionSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  let sme_id = value.sme_id;

  // Create new SME inline if no sme_id provided
  if (!sme_id) {
    const smeRoutes = require('./sme');
    const smeBody = {
      full_name: value.sme_name || 'Unknown SME',
      role: value.sme_role || '',
      department: value.sme_department || '',
      location: value.sme_location || '',
      contact_json: { email: value.sme_email || '', phone: value.sme_phone || '' },
      journey_stages_owned_json: value.journey_stages || []
    };
    const newSme = await smeRoutes.create(catalystApp, {}, smeBody, user);
    sme_id = newSme.sme_id;
  }

  const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', sme_id);
  if (!sme) { const e = new Error('SME not found'); e.status = 404; throw e; }

  // Determine journey type and initial stage
  const journeyType = sme.journey_type || 'guest';
  const journey = getJourney(journeyType);
  const stagesOwned = safeParse(sme.journey_stages_owned_json, []);
  const initialStage = Array.isArray(stagesOwned) && stagesOwned.length > 0
    ? stagesOwned[0]
    : getFirstStage(journeyType);

  const session_id = await generateId(catalystApp, 'SESSION');
  const now = new Date().toISOString();

  const initialState = {
    current_stage: initialStage,
    current_topic: '',
    topics_covered: [],
    topics_remaining: stagesOwned.slice(1),
    should_move_to_next_stage: false,
    stage_completion_estimate: 0
  };

  // Create session (closed_at omitted on create — Date column rejects empty string)
  await insert(catalystApp, 'Sessions', {
    session_id,
    sme_id,
    journey_type: journeyType,
    interviewer_user_id: user ? user.user_id : '',
    date_session: now,
    duration_minutes: 0,
    method: 'interview',
    summary: '',
    conversation_state_json: safeStringify(initialState),
    status: 'active',
    created_at: now
  });

  // Build opening message
  const config = await getConfig(catalystApp);
  const hydrateSme = {
    ...sme,
    journey_stages_owned_json: stagesOwned,
    domains_json: safeParse(sme.domains_json, []),
    systems_used_json: safeParse(sme.systems_used_json, [])
  };

  const systemPrompt = buildSystemPrompt({
    sme: hydrateSme,
    sessionState: initialState,
    existingRecords: { systems: [], processes: [], gaps: [] },
    openConflicts: [],
    openQuestions: [],
    journeyType
  });

  const openingMessages = [{
    role: 'user',
    content: `SESSION_START: Begin the interview. Greet the SME warmly and ask your first question about the ${initialStage} stage.`
  }];

  // Call Claude for opening message with fallback
  const fallbackGreeting = `Hi ${sme.full_name}! Welcome to the ${journey.label} Mapping interview. I'm here to learn about your experience and expertise.\n\nLet's start with the **${initialStage.replace(/_/g, ' ')}** stage of the ${journey.persona}. Can you walk me through what typically happens during this stage from your perspective?`;

  let reply = fallbackGreeting;
  let claudeResponse = {};
  try {
    console.log('[chat] Calling Claude for opening message, session:', session_id);
    claudeResponse = await callClaudeForSummary(systemPrompt, openingMessages, config);
    const claudeReply = claudeResponse.reply || (typeof claudeResponse === 'string' ? claudeResponse : '');
    if (claudeReply && typeof claudeReply === 'string' && claudeReply.trim().length > 0) {
      reply = claudeReply;
    } else {
      console.warn('[chat] Claude returned empty reply, using fallback. Response:', JSON.stringify(claudeResponse).slice(0, 300));
    }
  } catch (claudeErr) {
    console.error('[chat] Claude API error for opening message:', claudeErr.message);
  }

  // Save opening message to ChatHistory
  const msgId = await generateId(catalystApp, 'MSG');
  await insert(catalystApp, 'ChatHistory', {
    message_id: msgId,
    session_id,
    role: 'agent',
    content: reply,
    extractions_json: safeStringify(claudeResponse.extractions || {}),
    conflicts_json: '[]',
    open_questions_json: '[]',
    conversation_state_json: safeStringify(claudeResponse.conversation_state || initialState),
    chat_history_timestamp: new Date().toISOString()
  });

  // Update SME status
  try {
    await update(catalystApp, 'SMERegister', sme.ROWID, {
      interview_status: 'in_progress',
      updated_at: new Date().toISOString()
    });
  } catch (e) { /* non-fatal */ }

  return {
    session_id,
    sme: hydrateSme,
    opening_message: reply,
    conversation_state: claudeResponse.conversation_state || initialState
  };
}

// GET /chat/sessions
async function listSessions(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM Sessions';
  if (queryParams && queryParams.journey_type) {
    sql += ` WHERE journey_type = '${queryParams.journey_type}'`;
  }
  sql += ' ORDER BY created_at DESC';
  const sessions = await query(catalystApp, sql);
  const result = [];
  for (const s of sessions) {
    let sme_name = '';
    if (s.sme_id) {
      const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', s.sme_id);
      sme_name = sme ? sme.full_name : '';
    }
    const state = safeParse(s.conversation_state_json, {});
    result.push({
      session_id: s.session_id,
      sme_id: s.sme_id,
      sme_name,
      journey_type: s.journey_type || 'guest',
      status: s.status,
      session_date: s.date_session,
      current_stage: state.current_stage || '',
      duration_minutes: s.duration_minutes
    });
  }
  return result;
}

// GET /chat/:sessionId  (resume)
async function resumeSession(catalystApp, params) {
  const session = await getByField(catalystApp, 'Sessions', 'session_id', params.sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }

  const sme = session.sme_id
    ? await getByField(catalystApp, 'SMERegister', 'sme_id', session.sme_id)
    : null;

  const chatRows = await getAllByField(catalystApp, 'ChatHistory', 'session_id', params.sessionId);
  chatRows.sort((a, b) => (a.chat_history_timestamp || '').localeCompare(b.chat_history_timestamp || ''));

  const messages = chatRows.map(row => ({
    message_id: row.message_id,
    role: row.role,
    content: row.content,
    extractions: safeParse(row.extractions_json, {}),
    conflicts: safeParse(row.conflicts_json, []),
    open_questions: safeParse(row.open_questions_json, []),
    conversation_state: safeParse(row.conversation_state_json, {}),
    timestamp: row.chat_history_timestamp
  }));

  return {
    session: {
      ...session,
      conversation_state: safeParse(session.conversation_state_json, {})
    },
    sme: sme ? {
      ...sme,
      journey_stages_owned_json: safeParse(sme.journey_stages_owned_json, []),
      domains_json: safeParse(sme.domains_json, []),
      systems_used_json: safeParse(sme.systems_used_json, [])
    } : null,
    messages,
    conversation_state: safeParse(session.conversation_state_json, {})
  };
}

// POST /chat/:sessionId/message
async function sendMessage(catalystApp, params, body, user) {
  const { error, value } = validate(sendMessageSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }
  return processMessage(catalystApp, params.sessionId, value.content, user ? user.user_id : '');
}

// POST /chat/:sessionId/action
async function quickAction(catalystApp, params, body, user) {
  const { error, value } = validate(quickActionSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const { action } = value;
  const sessionId = params.sessionId;

  switch (action) {
    case 'next':
      return processMessage(catalystApp, sessionId, 'COMMAND:NEXT — Skip this topic. Move to the next area.', user ? user.user_id : '');

    case 'back':
      return processMessage(catalystApp, sessionId, 'COMMAND:BACK — Let\'s revisit the previous topic.', user ? user.user_id : '');

    case 'correct':
      return processMessage(catalystApp, sessionId, `COMMAND:CORRECT — I need to correct record ${value.record_id || ''}.`, user ? user.user_id : '');

    case 'done':
      return closeSession(catalystApp, params, body, user);

    case 'pause': {
      const session = await getByField(catalystApp, 'Sessions', 'session_id', sessionId);
      if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
      await update(catalystApp, 'Sessions', session.ROWID, { status: 'paused' });
      return { status: 'paused', message: 'Session paused. You can resume anytime.' };
    }

    case 'summary': {
      const chatRows = await getAllByField(catalystApp, 'ChatHistory', 'session_id', sessionId);
      let systemsCount = 0, processesCount = 0, gapsCount = 0, conflictsCount = 0;
      for (const row of chatRows) {
        if (row.role !== 'agent') continue;
        const ext = safeParse(row.extractions_json, {});
        systemsCount += (ext.systems || []).length;
        processesCount += (ext.process_steps || []).length;
        gapsCount += (ext.gaps || []).length;
        const confs = safeParse(row.conflicts_json, []);
        conflictsCount += confs.length;
      }
      return {
        summary: {
          systems_mentioned: systemsCount,
          process_steps_mentioned: processesCount,
          gaps_identified: gapsCount,
          conflicts_found: conflictsCount,
          message_count: chatRows.length
        }
      };
    }

    case 'status': {
      const projectRoutes = require('./project');
      return projectRoutes.recalculate(catalystApp);
    }

    case 'help':
      return {
        commands: [
          { action: 'next',    description: 'Skip to next topic' },
          { action: 'back',    description: 'Revisit previous topic' },
          { action: 'correct', description: 'Correct a previous record (requires record_id)' },
          { action: 'pause',   description: 'Pause and save the session' },
          { action: 'summary', description: 'Show extraction counts for this session' },
          { action: 'status',  description: 'Show overall project completion' },
          { action: 'done',    description: 'Close and summarise the session' }
        ]
      };

    default: {
      const e = new Error(`Unknown action: ${action}`); e.status = 400; throw e;
    }
  }
}

// POST /chat/:sessionId/close
async function closeSession(catalystApp, params, body, user) {
  const session = await getByField(catalystApp, 'Sessions', 'session_id', params.sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }

  const chatRows = await getAllByField(catalystApp, 'ChatHistory', 'session_id', params.sessionId);
  const config = await getConfig(catalystApp);

  // Compile totals
  let totalSystems = 0, totalProcesses = 0, totalGaps = 0, totalConflicts = 0;
  for (const row of chatRows) {
    if (row.role !== 'agent') continue;
    const ext = safeParse(row.extractions_json, {});
    totalSystems += (ext.systems || []).length;
    totalProcesses += (ext.process_steps || []).length;
    totalGaps += (ext.gaps || []).length;
    totalConflicts += safeParse(row.conflicts_json, []).length;
  }

  // Call Claude for summary
  const systemPrompt = 'You are summarising a completed journey mapping interview. Respond with a comprehensive plain-text summary.';
  const summaryMessages = [
    {
      role: 'user',
      content: `Generate a session summary. Include: key findings, systems documented, processes mapped, gaps identified, conflicts found, open questions, and recommended next steps. Session had ${chatRows.length} messages, extracted ${totalSystems} systems, ${totalProcesses} process steps, ${totalGaps} gaps, and ${totalConflicts} conflicts. Respond as valid JSON: {"reply": "...full summary text..."}`
    }
  ];

  let summary = '';
  try {
    const summaryResponse = await callClaudeForSummary(systemPrompt, summaryMessages, config);
    summary = summaryResponse.reply || JSON.stringify(summaryResponse);
  } catch (e) {
    summary = `Session completed. Extracted: ${totalSystems} systems, ${totalProcesses} process steps, ${totalGaps} gaps, ${totalConflicts} conflicts.`;
  }

  // Calculate duration
  const startTime = new Date(session.created_at).getTime();
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  const now = new Date().toISOString();
  await update(catalystApp, 'Sessions', session.ROWID, {
    status: 'closed',
    closed_at: now,
    duration_minutes: durationMinutes,
    summary
  });

  // Update SME interview status
  if (session.sme_id) {
    try {
      const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', session.sme_id);
      if (sme && sme.interview_status !== 'validated') {
        await update(catalystApp, 'SMERegister', sme.ROWID, {
          interview_status: 'completed',
          updated_at: now
        });
      }
    } catch (e) { /* non-fatal */ }
  }

  // Recalculate project state
  try {
    const projectRoutes = require('./project');
    await projectRoutes.recalculate(catalystApp);
  } catch (e) { /* non-fatal */ }

  return {
    summary,
    records_created_counts: {
      systems: totalSystems,
      processes: totalProcesses,
      gaps: totalGaps,
      conflicts: totalConflicts
    },
    duration_minutes: durationMinutes
  };
}

// ── SME Self-Service Endpoints ────────────────────────────────────────────

// POST /chat/sme-start
async function startSmeSession(catalystApp, params, body) {
  const { error, value } = validate(smeSessionStartSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const tokenData = await verifySmeToken(catalystApp, value.token);
  const sme_id = tokenData.sme_id;

  // Check if there's already an active session for this SME from a link
  const existingSessions = await getAllByField(catalystApp, 'Sessions', 'sme_id', sme_id);
  const activeSession = existingSessions.find(s => s.status === 'active' && s.method === 'sme_self_service');
  if (activeSession) {
    // Check if session has any messages — if not, it was a broken/timed-out attempt
    const existingMessages = await getAllByField(catalystApp, 'ChatHistory', 'session_id', activeSession.session_id);
    if (existingMessages.length > 0) {
      // Resume existing session with its messages
      return resumeSmeSession(catalystApp, { sessionId: activeSession.session_id }, { token: value.token });
    }
    // Broken session (no messages) — mark it closed and start fresh
    console.warn('[chat] Found active session with no messages, closing stale session:', activeSession.session_id);
    try {
      await update(catalystApp, 'Sessions', activeSession.ROWID, { status: 'closed', closed_at: new Date().toISOString() });
    } catch (e) { /* non-fatal */ }
  }

  const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', sme_id);
  if (!sme) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const journeyType = sme.journey_type || 'guest';
  const journey = getJourney(journeyType);
  const stagesOwned = safeParse(sme.journey_stages_owned_json, []);
  const initialStage = Array.isArray(stagesOwned) && stagesOwned.length > 0
    ? stagesOwned[0]
    : getFirstStage(journeyType);

  const session_id = await generateId(catalystApp, 'SESSION');
  const now = new Date().toISOString();

  const initialState = {
    current_stage: initialStage,
    current_topic: '',
    topics_covered: [],
    topics_remaining: stagesOwned.slice(1),
    should_move_to_next_stage: false,
    stage_completion_estimate: 0
  };

  await insert(catalystApp, 'Sessions', {
    session_id,
    sme_id,
    journey_type: journeyType,
    interviewer_user_id: '',
    date_session: now,
    duration_minutes: 0,
    method: 'sme_self_service',
    summary: '',
    conversation_state_json: safeStringify(initialState),
    status: 'active',
    created_at: now
  });

  const config = await getConfig(catalystApp);
  const hydrateSme = {
    ...sme,
    journey_stages_owned_json: stagesOwned,
    domains_json: safeParse(sme.domains_json, []),
    systems_used_json: safeParse(sme.systems_used_json, [])
  };

  const systemPrompt = buildSystemPrompt({
    sme: hydrateSme,
    sessionState: initialState,
    existingRecords: { systems: [], processes: [], gaps: [] },
    openConflicts: [],
    openQuestions: [],
    journeyType
  });

  const openingMessages = [{
    role: 'user',
    content: `SESSION_START: Begin the interview. Greet the SME warmly and ask your first question about the ${initialStage} stage.`
  }];

  // Call Claude for opening message with fallback
  const fallbackGreeting = `Hi ${sme.full_name}! Welcome to the ${journey.label} Mapping interview. I'm here to learn about your experience and expertise.\n\nLet's start with the **${initialStage.replace(/_/g, ' ')}** stage of the ${journey.persona}. Can you walk me through what typically happens during this stage from your perspective?`;

  let reply = fallbackGreeting;
  let claudeResponse = {};
  try {
    console.log('[chat] Calling Claude for opening message, session:', session_id);
    claudeResponse = await callClaudeForSummary(systemPrompt, openingMessages, config);
    const claudeReply = claudeResponse.reply || (typeof claudeResponse === 'string' ? claudeResponse : '');
    if (claudeReply && typeof claudeReply === 'string' && claudeReply.trim().length > 0) {
      reply = claudeReply;
    } else {
      console.warn('[chat] Claude returned empty reply, using fallback. Response:', JSON.stringify(claudeResponse).slice(0, 300));
    }
  } catch (claudeErr) {
    console.error('[chat] Claude API error for opening message:', claudeErr.message);
    // Use fallback greeting — session still works, user can chat
  }

  const msgId = await generateId(catalystApp, 'MSG');
  await insert(catalystApp, 'ChatHistory', {
    message_id: msgId,
    session_id,
    role: 'agent',
    content: reply,
    extractions_json: safeStringify(claudeResponse.extractions || {}),
    conflicts_json: '[]',
    open_questions_json: '[]',
    conversation_state_json: safeStringify(claudeResponse.conversation_state || initialState),
    chat_history_timestamp: new Date().toISOString()
  });

  try {
    await update(catalystApp, 'SMERegister', sme.ROWID, {
      interview_status: 'in_progress',
      updated_at: new Date().toISOString()
    });
  } catch (e) { /* non-fatal */ }

  return {
    session_id,
    sme: { full_name: sme.full_name, role: sme.role, department: sme.department },
    opening_message: reply,
    conversation_state: claudeResponse.conversation_state || initialState,
    assigned_stages: stagesOwned,
    sop_files: safeParse(sme.sop_files_json, {})
  };
}

// GET /chat/sme/:sessionId
async function resumeSmeSession(catalystApp, params, body, user, queryParams) {
  const token = body?.token || queryParams?.token;
  const tokenData = await verifySmeToken(catalystApp, token);

  const session = await getByField(catalystApp, 'Sessions', 'session_id', params.sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
  if (session.sme_id !== tokenData.sme_id) { const e = new Error('Access denied'); e.status = 403; throw e; }

  const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', session.sme_id);

  const chatRows = await getAllByField(catalystApp, 'ChatHistory', 'session_id', params.sessionId);
  chatRows.sort((a, b) => (a.chat_history_timestamp || '').localeCompare(b.chat_history_timestamp || ''));

  const messages = chatRows.map(row => ({
    message_id: row.message_id,
    role: row.role,
    content: row.content,
    timestamp: row.chat_history_timestamp
  }));

  const stagesOwned = sme ? safeParse(sme.journey_stages_owned_json, []) : [];

  return {
    session_id: session.session_id,
    session: { status: session.status },
    status: session.status,
    sme: sme ? { full_name: sme.full_name, role: sme.role, department: sme.department } : null,
    messages,
    conversation_state: safeParse(session.conversation_state_json, {}),
    assigned_stages: stagesOwned,
    sop_files: sme ? safeParse(sme.sop_files_json, {}) : {}
  };
}

// POST /chat/sme/:sessionId/message
async function sendSmeMessage(catalystApp, params, body) {
  const { error, value } = validate(smeSessionMessageSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const tokenData = await verifySmeToken(catalystApp, value.token);

  const session = await getByField(catalystApp, 'Sessions', 'session_id', params.sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
  if (session.sme_id !== tokenData.sme_id) { const e = new Error('Access denied'); e.status = 403; throw e; }
  if (session.status === 'closed') { const e = new Error('Session is closed'); e.status = 400; throw e; }

  return processMessage(catalystApp, params.sessionId, value.content, '');
}

// POST /chat/sme/:sessionId/close
async function closeSmeSession(catalystApp, params, body) {
  const token = body?.token;
  const tokenData = await verifySmeToken(catalystApp, token);

  const session = await getByField(catalystApp, 'Sessions', 'session_id', params.sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
  if (session.sme_id !== tokenData.sme_id) { const e = new Error('Access denied'); e.status = 403; throw e; }

  return closeSession(catalystApp, params, body, null);
}

// DELETE /chat/:sessionId — delete a session and its chat history
async function deleteSession(catalystApp, params) {
  const session = await getByField(catalystApp, 'Sessions', 'session_id', params.sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }

  // Delete all chat history for this session
  try {
    const messages = await getAllByField(catalystApp, 'ChatHistory', 'session_id', params.sessionId);
    for (const msg of messages) {
      await deleteRow(catalystApp, 'ChatHistory', msg.ROWID);
    }
  } catch (e) {
    console.error('[chat] Error deleting chat history:', e.message);
  }

  await deleteRow(catalystApp, 'Sessions', session.ROWID);
  return { success: true, deleted: params.sessionId };
}

module.exports = {
  startSession, listSessions, resumeSession, sendMessage, quickAction, closeSession,
  startSmeSession, resumeSmeSession, sendSmeMessage, closeSmeSession, deleteSession
};
