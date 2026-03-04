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
          <div class="sme-header-progress" title="Your current progress through the interview stages">
            <span class="sme-progress-label" title="Current journey stage being discussed">${esc(stageName)}</span>
            <div class="sme-progress-track">
              <div class="sme-progress-fill" id="progress-fill" style="width:${progressPct}%"></div>
            </div>
            <span class="sme-progress-pct" id="progress-pct">${progressPct}%</span>
          </div>
        </div>

        <div class="sme-chat-body">
          <div class="sme-help-banner" id="help-banner">
            <div class="sme-help-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="sme-help-content">
              <strong>Welcome to your Journey Mapping Interview</strong>
              <p>Our AI interviewer will guide you through each stage of the guest journey. Share your experiences, observations, and insights — there are no wrong answers. You can type your response below and press <kbd>Enter</kbd> to send. When you're done, click <em>Finish Interview</em>.</p>
            </div>
            <button class="sme-help-dismiss" id="dismiss-help" title="Dismiss">&times;</button>
          </div>
          <div class="sme-chat-messages" id="chat-messages"></div>
        </div>

        <div class="sme-chat-input-area" id="input-area">
          <div class="sme-chat-input-row">
            <textarea class="sme-chat-textarea" id="chat-input" placeholder="Type your response and press Enter to send..." rows="1"></textarea>
            <button class="sme-chat-send-btn" id="send-btn" title="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div class="sme-chat-footer">
            <span class="sme-input-hint">Press <kbd>Enter</kbd> to send &bull; <kbd>Shift+Enter</kbd> for new line</span>
            <button class="sme-finish-btn" id="done-btn" title="End the interview and submit your responses">Finish Interview</button>
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

  // Dismiss help banner
  document.getElementById('dismiss-help').addEventListener('click', () => {
    const banner = document.getElementById('help-banner');
    banner.style.transition = 'opacity 0.2s ease, max-height 0.3s ease, padding 0.3s ease';
    banner.style.opacity = '0';
    banner.style.maxHeight = '0';
    banner.style.padding = '0 16px';
    banner.style.overflow = 'hidden';
    setTimeout(() => banner.remove(), 300);
  });

  // Render messages: on resume, messages array contains full history (including opening);
  // on new session, only opening_message is set.
  if (sessionData.messages && sessionData.messages.length > 0) {
    for (const msg of sessionData.messages) {
      appendMessage(msg.role === 'agent' ? 'agent' : 'user', msg.content);
    }
  } else if (opening_message) {
    appendMessage('agent', opening_message);
  }

  // If resuming a closed/completed session, show finished state immediately
  if (sessionData.session?.status === 'closed' || conversation_state?.interview_complete === true) {
    showInterviewFinished();
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
      // Check if interview was auto-completed by the backend
      if (res.interview_complete) {
        showInterviewFinished();
        return;
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

  function showInterviewFinished() {
    // Update progress to 100%
    const pctEl = document.getElementById('progress-pct');
    const fill = document.getElementById('progress-fill');
    const label = document.querySelector('.sme-progress-label');
    if (pctEl) pctEl.textContent = '100%';
    if (fill) fill.style.width = '100%';
    if (label) label.textContent = 'Complete';

    // Dismiss help banner if still visible
    const banner = document.getElementById('help-banner');
    if (banner) banner.remove();

    // Replace input area with completion message
    const inputArea = document.getElementById('input-area');
    if (inputArea) {
      inputArea.innerHTML = `
        <div class="sme-interview-done-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div>
            <strong>Interview Complete</strong>
            <p>Thank you for your time! Your responses have been recorded. You can now close this tab.</p>
          </div>
        </div>`;
    }
  }
}

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
