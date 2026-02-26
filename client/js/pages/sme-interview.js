import { smePublic } from '../api.js';

export default async function renderSmeInterview(container, params) {
  const token = params.token;
  container.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';

  let sessionData;
  try {
    sessionData = await smePublic.startSession(token);
  } catch (e) {
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
        <div class="card" style="max-width:480px;text-align:center">
          <h2 style="margin-bottom:12px">Unable to Start Interview</h2>
          <p style="color:var(--text-secondary)">${esc(e.message)}</p>
          <p style="color:var(--text-secondary);font-size:13px;margin-top:16px">Your link may have expired. Please contact your project coordinator for a new one.</p>
        </div>
      </div>`;
    return;
  }

  const { session_id, sme, opening_message, conversation_state } = sessionData;

  container.innerHTML = `
    <div class="chat-page" style="height:100vh">
      <div class="chat-header" style="background:var(--primary);color:#fff">
        <div style="flex:1">
          <h3 style="margin:0;color:#fff">Journey Mapping Interview</h3>
          <div style="font-size:13px;opacity:0.85">${esc(sme?.full_name || 'SME')} — ${esc(sme?.role || '')}</div>
        </div>
        <div class="chat-progress" style="color:#fff">
          <span style="font-size:12px;opacity:0.85">${(conversation_state?.current_stage || 'discovery').replace(/_/g, ' ')}</span>
          <div class="chat-progress-bar"><div class="chat-progress-bar-fill" id="progress-fill" style="width:${Math.round((conversation_state?.stage_completion_estimate || 0) * 100)}%"></div></div>
          <span id="progress-pct">${Math.round((conversation_state?.stage_completion_estimate || 0) * 100)}%</span>
        </div>
      </div>
      <div class="chat-body" style="flex-direction:column">
        <div class="chat-messages" id="chat-messages" style="flex:1;overflow-y:auto;padding:16px"></div>
        <div class="chat-input-area" id="input-area">
          <div class="chat-input-row">
            <textarea class="chat-textarea" id="chat-input" placeholder="Type your response..." rows="1"></textarea>
            <button class="chat-send-btn" id="send-btn">Send</button>
          </div>
          <div style="text-align:center;margin-top:8px">
            <button class="btn btn-sm btn-ghost" id="done-btn" style="color:var(--text-secondary)">Finish Interview</button>
          </div>
        </div>
        <div id="thank-you" style="display:none;text-align:center;padding:48px 24px">
          <h2>Thank You!</h2>
          <p style="color:var(--text-secondary);max-width:400px;margin:12px auto">Your responses have been recorded. The project team will review the information you provided.</p>
        </div>
      </div>
    </div>`;

  const msgContainer = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  let currentState = conversation_state;

  // Render opening message
  if (opening_message) {
    appendMessage('agent', opening_message);
  }

  // Also render any existing messages if resuming
  if (sessionData.messages) {
    for (const msg of sessionData.messages) {
      appendMessage(msg.role === 'agent' ? 'agent' : 'user', msg.content);
    }
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
      document.getElementById('thank-you').style.display = 'block';
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
    div.className = `msg-row ${role}`;
    div.innerHTML = `
      <div class="msg-avatar ${role}">${role === 'agent' ? '🤖' : '👤'}</div>
      <div class="msg-bubble ${role}">${esc(content).replace(/\n/g, '<br>')}</div>`;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  let typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'msg-row agent';
    typingEl.innerHTML = '<div class="msg-avatar agent">🤖</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
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
