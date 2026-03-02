import { smePublic } from '../api.js';

export default async function renderSmeInterview(container, params) {
  const token = params.token;
  container.innerHTML = '<div class="sme-interview-wrapper"><div class="sme-chat-container" style="align-items:center;justify-content:center"><div class="spinner"></div></div></div>';

  let sessionData;
  try {
    sessionData = await smePublic.startSession(token);
  } catch (e) {
    container.innerHTML = `
      <div class="sme-interview-wrapper">
        <div class="sme-chat-container sme-error-card">
          <h2>Unable to Start Interview</h2>
          <p>${esc(e.message)}</p>
          <p>Your link may have expired. Please contact your project coordinator for a new one.</p>
        </div>
      </div>`;
    return;
  }

  const { session_id, sme, opening_message, conversation_state } = sessionData;

  const stageName = (conversation_state?.current_stage || 'discovery').replace(/_/g, ' ');
  const progressPct = Math.round((conversation_state?.stage_completion_estimate || 0) * 100);

  container.innerHTML = `
    <div class="sme-interview-wrapper">
      <div class="sme-chat-container">
        <div class="sme-chat-header">
          <div class="sme-header-left">
            <div class="sme-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <h3 class="sme-header-title">Journey Mapping Interview</h3>
              <div class="sme-header-subtitle">${esc(sme?.full_name || 'SME')} &mdash; ${esc(sme?.role || 'SME')}</div>
            </div>
          </div>
          <div class="sme-header-progress">
            <span class="sme-progress-label">${esc(stageName)}</span>
            <div class="sme-progress-track">
              <div class="sme-progress-fill" id="progress-fill" style="width:${progressPct}%"></div>
            </div>
            <span class="sme-progress-pct" id="progress-pct">${progressPct}%</span>
          </div>
        </div>

        <div class="sme-chat-body">
          <div class="sme-chat-messages" id="chat-messages"></div>
        </div>

        <div class="sme-chat-input-area" id="input-area">
          <div class="sme-chat-input-row">
            <textarea class="sme-chat-textarea" id="chat-input" placeholder="Type your response..." rows="1"></textarea>
            <button class="sme-chat-send-btn" id="send-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div class="sme-chat-footer">
            <button class="sme-finish-btn" id="done-btn">Finish Interview</button>
          </div>
        </div>

        <div class="sme-thank-you" id="thank-you" style="display:none">
          <div class="sme-thank-you-icon">&#10003;</div>
          <h2>Thank You!</h2>
          <p>Your responses have been recorded. The project team will review the information you provided.</p>
        </div>
      </div>
    </div>`;

  const msgContainer = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  let currentState = conversation_state;

  // Render messages: on resume, messages array contains full history (including opening);
  // on new session, only opening_message is set.
  if (sessionData.messages && sessionData.messages.length > 0) {
    for (const msg of sessionData.messages) {
      appendMessage(msg.role === 'agent' ? 'agent' : 'user', msg.content);
    }
  } else if (opening_message) {
    appendMessage('agent', opening_message);
  }

  // Auto-grow textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Send on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener('click', sendMessage);

  // Done button
  document.getElementById('done-btn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to finish the interview?')) return;
    showTyping();
    try {
      await smePublic.close(session_id, token);
      hideTyping();
      document.getElementById('input-area').style.display = 'none';
      document.querySelector('.sme-chat-body').style.display = 'none';
      document.getElementById('thank-you').style.display = 'flex';
    } catch (e) {
      hideTyping();
      appendMessage('agent', 'Failed to close session. Please try again.');
    }
  });

  async function sendMessage() {
    const content = input.value.trim();
    if (!content || sendBtn.disabled) return;
    input.value = '';
    input.style.height = 'auto';
    appendMessage('user', content);
    showTyping();
    sendBtn.disabled = true;
    try {
      const res = await smePublic.sendMessage(session_id, content, token);
      hideTyping();
      if (res.reply) {
        appendMessage('agent', res.reply);
      }
      if (res.conversation_state) {
        currentState = res.conversation_state;
        updateProgress(currentState);
      }
    } catch (err) {
      hideTyping();
      appendMessage('agent', 'Sorry, something went wrong. Please try sending your message again.');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function appendMessage(role, content) {
    const div = document.createElement('div');
    div.className = `sme-msg-row ${role}`;
    div.innerHTML = `
      <div class="sme-msg-avatar ${role}">${role === 'agent' ? '&#129302;' : '&#128100;'}</div>
      <div class="sme-msg-bubble ${role}">${esc(content).replace(/\n/g, '<br>')}</div>`;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  let typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'sme-msg-row agent';
    typingEl.innerHTML = '<div class="sme-msg-avatar agent">&#129302;</div><div class="sme-typing-indicator"><div class="sme-typing-dot"></div><div class="sme-typing-dot"></div><div class="sme-typing-dot"></div></div>';
    msgContainer.appendChild(typingEl);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  function updateProgress(state) {
    const pct = Math.round((state?.stage_completion_estimate || 0) * 100);
    const pctEl = document.getElementById('progress-pct');
    const fill = document.getElementById('progress-fill');
    if (pctEl) pctEl.textContent = pct + '%';
    if (fill) fill.style.width = pct + '%';
  }
}

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
