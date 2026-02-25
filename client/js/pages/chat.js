import { chat as chatApi } from '../api.js';
import { renderMessage } from '../components/chat-message.js';
import { toast } from '../components/toast.js';
import { showModal, showConfirm } from '../components/modal.js';

const STAGES = ['discovery','booking','pre_arrival','check_in','in_stay','check_out','post_stay','re_engagement'];

export default async function renderChat(container, params) {
  const sessionId = params.id;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  let sessionData;
  try {
    sessionData = await chatApi.getSession(sessionId);
  } catch (e) {
    container.innerHTML = `<div class="page-body"><div class="card"><p style="color:var(--error)">${e.message}</p></div></div>`;
    return;
  }

  const { session, sme, messages, conversation_state } = sessionData;
  const isClosed = session.status === 'closed';

  container.innerHTML = `
    <div class="chat-page">
      <div class="chat-header">
        <div>
          <a href="#/dashboard" style="font-size:12px;color:var(--text-secondary)">← Back</a>
        </div>
        <div class="chat-header-info">
          <h3>🤖 Journey Mapping Agent</h3>
          <div class="chat-header-meta">${session.session_id} • ${sme ? sme.full_name : 'Unknown SME'}</div>
        </div>
        <div class="chat-progress">
          <span style="font-size:12px;color:var(--text-secondary)">${(conversation_state.current_stage || 'discovery').replace(/_/g,' ')}</span>
          <div class="chat-progress-bar"><div class="chat-progress-bar-fill" id="progress-fill" style="width:${Math.round((conversation_state.stage_completion_estimate || 0) * 100)}%"></div></div>
          <span id="progress-pct">${Math.round((conversation_state.stage_completion_estimate || 0) * 100)}%</span>
        </div>
      </div>
      <div class="chat-body">
        <div class="chat-messages-area">
          <div class="chat-messages" id="chat-messages"></div>
          <div class="chat-input-area" ${isClosed ? 'style="opacity:0.5;pointer-events:none"' : ''}>
            <div class="chat-quick-actions">
              <button class="quick-btn" data-action="next">⏭ Next</button>
              <button class="quick-btn" data-action="pause">⏸ Pause</button>
              <button class="quick-btn" data-action="summary">📊 Summary</button>
              <button class="quick-btn" data-action="done">✅ Done</button>
              <button class="quick-btn" data-action="help">❓ Help</button>
            </div>
            <div class="chat-input-row">
              <textarea class="chat-textarea" id="chat-input" placeholder="Type your response..." rows="1" ${isClosed ? 'disabled' : ''}></textarea>
              <button class="chat-send-btn" id="send-btn" ${isClosed ? 'disabled' : ''}>Send ➤</button>
            </div>
            ${isClosed ? '<p style="font-size:12px;color:var(--text-secondary);margin-top:8px;text-align:center">This session is closed. <a href="#/chat/new">Start a new session</a></p>' : ''}
          </div>
        </div>
        <div class="chat-side-panel" id="side-panel">
          <div class="side-panel-section">
            <h4>Records Created</h4>
            <div class="record-counts" id="record-counts">
              <div class="record-count-item"><div class="count" id="sys-count">0</div><div class="label">Systems</div></div>
              <div class="record-count-item"><div class="count" id="proc-count">0</div><div class="label">Processes</div></div>
              <div class="record-count-item"><div class="count" id="gap-count">0</div><div class="label">Gaps</div></div>
              <div class="record-count-item"><div class="count" id="conf-count">0</div><div class="label">Conflicts</div></div>
            </div>
          </div>
          <div class="side-panel-section">
            <h4>Journey Stages</h4>
            <ul class="stage-checklist" id="stage-checklist"></ul>
          </div>
          <div class="side-panel-section">
            <h4>Open Questions</h4>
            <div id="questions-list" style="font-size:12px;color:var(--text-secondary)">None yet</div>
          </div>
        </div>
      </div>
    </div>`;

  const msgContainer = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  // Render history
  let sysTotal = 0, procTotal = 0, gapTotal = 0, confTotal = 0;
  for (const msg of messages) {
    msgContainer.innerHTML += renderMessage(msg);
    if (msg.role === 'agent' && msg.extractions) {
      sysTotal += (msg.extractions.systems || []).length;
      procTotal += (msg.extractions.process_steps || []).length;
      gapTotal += (msg.extractions.gaps || []).length;
    }
    if (msg.conflicts) confTotal += msg.conflicts.length;
  }
  updateSidePanel(conversation_state, sysTotal, procTotal, gapTotal, confTotal);
  scrollToBottom();

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Send on Enter (Shift+Enter = newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', sendMessage);

  // Quick actions
  container.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action));
  });

  async function sendMessage() {
    const content = input.value.trim();
    if (!content || sendBtn.disabled) return;
    input.value = '';
    input.style.height = 'auto';
    appendMessage({ role: 'user', content });
    showTyping();
    sendBtn.disabled = true;
    try {
      const res = await chatApi.sendMessage(sessionId, content);
      hideTyping();
      appendMessage({ role: 'agent', content: res.reply, timestamp: new Date().toISOString() });
      sysTotal += (res.extractions?.systems || []).length;
      procTotal += (res.extractions?.process_steps || []).length;
      gapTotal += (res.extractions?.gaps || []).length;
      confTotal += (res.conflicts || []).length;
      updateSidePanel(res.conversation_state || conversation_state, sysTotal, procTotal, gapTotal, confTotal);
    } catch (err) {
      hideTyping();
      toast(err.message, 'error');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  async function handleAction(action) {
    if (action === 'done') {
      showConfirm('Close this session and generate a summary?', async () => {
        showTyping();
        try {
          const res = await chatApi.close(sessionId);
          hideTyping();
          showModal({ title: 'Session Summary', size: 'lg', body: `<pre style="white-space:pre-wrap;font-size:13px">${res.summary}</pre>` });
          setTimeout(() => { window.location.hash = '#/dashboard'; }, 2000);
        } catch (e) { hideTyping(); toast(e.message, 'error'); }
      });
      return;
    }
    if (action === 'help') {
      const res = await chatApi.quickAction(sessionId, 'help');
      showModal({ title: 'Available Commands', body: `<ul style="list-style:none">${res.commands.map(c => `<li style="padding:6px 0;border-bottom:1px solid var(--border)"><strong>${c.action}</strong> — ${c.description}</li>`).join('')}</ul>` });
      return;
    }
    if (action === 'summary') {
      showTyping();
      try {
        const res = await chatApi.quickAction(sessionId, 'summary');
        hideTyping();
        const s = res.summary || {};
        showModal({ title: 'Session Summary', body: `
          <p><strong>Messages:</strong> ${s.message_count || 0}</p>
          <p><strong>Systems mentioned:</strong> ${s.systems_mentioned || 0}</p>
          <p><strong>Process steps:</strong> ${s.process_steps_mentioned || 0}</p>
          <p><strong>Gaps identified:</strong> ${s.gaps_identified || 0}</p>
          <p><strong>Conflicts found:</strong> ${s.conflicts_found || 0}</p>` });
      } catch (e) { hideTyping(); toast(e.message, 'error'); }
      return;
    }
    showTyping();
    try {
      const res = await chatApi.quickAction(sessionId, action);
      hideTyping();
      if (res.status === 'paused') { toast('Session paused', 'success'); return; }
      if (res.reply) appendMessage({ role: 'agent', content: res.reply, timestamp: new Date().toISOString() });
    } catch (e) { hideTyping(); toast(e.message, 'error'); }
  }

  function appendMessage(msg) {
    msgContainer.innerHTML += renderMessage(msg);
    scrollToBottom();
  }

  let typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'msg-row agent';
    typingEl.innerHTML = `<div class="msg-avatar agent">🤖</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    msgContainer.appendChild(typingEl);
    scrollToBottom();
  }
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }
  function scrollToBottom() { msgContainer.scrollTop = msgContainer.scrollHeight; }

  function updateSidePanel(state, sys, proc, gap, conf) {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('sys-count', sys); el('proc-count', proc); el('gap-count', gap); el('conf-count', conf);

    const pct = Math.round((state?.stage_completion_estimate || 0) * 100);
    el('progress-pct', pct + '%');
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = pct + '%';

    const checklist = document.getElementById('stage-checklist');
    if (checklist && state?.current_stage) {
      const currentIdx = STAGES.indexOf(state.current_stage);
      checklist.innerHTML = STAGES.map((s, i) => {
        const cls = i < currentIdx ? 'done' : i === currentIdx ? 'active' : '';
        const icon = i < currentIdx ? '✓' : i === currentIdx ? '▶' : '';
        return `<li class="stage-item ${cls}"><span class="stage-icon">${icon}</span>${s.replace(/_/g,' ')}</li>`;
      }).join('');
    }
  }
}
