import { smePublic } from '../api.js';
import { JOURNEYS } from '../config/journeys.js';

// Build a unified stage label map from all journeys
const STAGE_LABELS = {};
for (const j of Object.values(JOURNEYS)) {
  for (const s of j.stages) {
    STAGE_LABELS[s.id] = s.label;
  }
}

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
  const stages = sessionData.assigned_stages || [];
  let sopFiles = sessionData.sop_files || {};

  const stageName = (conversation_state?.current_stage || 'discovery').replace(/_/g, ' ');
  const progressPct = Math.round((conversation_state?.stage_completion_estimate || 0) * 100);

  function buildStagePills() {
    if (stages.length === 0) return '';
    return `
      <div class="sme-stage-selector" id="stage-selector">
        ${stages.map(stageId => {
          const label = STAGE_LABELS[stageId] || stageId.replace(/_/g, ' ');
          const isActive = stageId === (conversation_state?.current_stage || stages[0]);
          const hasFile = sopFiles[stageId] ? true : false;
          return `
            <div class="sme-stage-pill-group">
              <button class="sme-stage-pill ${isActive ? 'active' : ''}" data-stage="${stageId}">
                ${esc(label)}${hasFile ? '<span class="sme-sop-check" title="SOP uploaded">&#10003;</span>' : ''}
              </button>
              <button class="sme-sop-upload-btn" data-stage="${stageId}" title="Upload SOP for ${esc(label)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>
            </div>`;
        }).join('')}
        <input type="file" id="sop-file-input" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" style="display:none">
      </div>`;
  }

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

        ${buildStagePills()}

        <div class="sme-chat-body">
          <div class="sme-help-banner" id="help-banner">
            <div class="sme-help-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="sme-help-content">
              <strong>Welcome to your Journey Mapping Interview</strong>
              <p>Our AI interviewer will guide you through each stage of the guest journey. Share your experiences, observations, and insights — there are no wrong answers. You can type your response below and press <kbd>Enter</kbd> to send. Use the stage tabs above to jump between topics, and the upload icon to attach SOP documents. When you're done, click <em>Finish Interview</em>.</p>
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

  // ── Stage pills: jump + file upload ────────────────────────────────
  const stageSelector = document.getElementById('stage-selector');
  const fileInput = document.getElementById('sop-file-input');
  let uploadTargetStage = null;

  if (stageSelector) {
    stageSelector.addEventListener('click', async (e) => {
      // Handle upload button click
      const uploadBtn = e.target.closest('.sme-sop-upload-btn');
      if (uploadBtn) {
        e.stopPropagation();
        uploadTargetStage = uploadBtn.dataset.stage;
        fileInput.click();
        return;
      }

      // Handle stage pill click (jump)
      const pill = e.target.closest('.sme-stage-pill');
      if (!pill || pill.classList.contains('active') || sendBtn.disabled) return;

      const targetStage = pill.dataset.stage;
      const label = STAGE_LABELS[targetStage] || targetStage.replace(/_/g, ' ');

      showTyping();
      sendBtn.disabled = true;
      try {
        const jumpMessage = `[STAGE_JUMP:${targetStage}] I'd like to talk about the ${label} stage now.`;
        const res = await smePublic.sendMessage(session_id, jumpMessage, token);
        hideTyping();
        if (res.reply) {
          appendMessage('agent', res.reply);
        }
        if (res.conversation_state) {
          currentState = res.conversation_state;
          updateProgress(currentState);
        }
        if (res.interview_complete) {
          showInterviewFinished();
        }
      } catch (err) {
        hideTyping();
        appendMessage('agent', 'Sorry, something went wrong switching stages. Please try again.');
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    });
  }

  // File upload handler
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file || !uploadTargetStage) return;
      fileInput.value = '';

      if (file.size > 10 * 1024 * 1024) {
        appendMessage('agent', 'File is too large. Maximum size is 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const stage = uploadTargetStage;
        const stageLabel = STAGE_LABELS[stage] || stage.replace(/_/g, ' ');

        const uploadBtn = stageSelector.querySelector(`.sme-sop-upload-btn[data-stage="${stage}"]`);
        if (uploadBtn) { uploadBtn.classList.add('uploading'); uploadBtn.disabled = true; }

        try {
          await smePublic.uploadSop(stage, file.name, file.type || 'application/octet-stream', base64, token);
          sopFiles[stage] = { filename: file.name, uploaded_at: new Date().toISOString() };
          updateSopIndicators();
          appendMessage('agent', `SOP file "${file.name}" uploaded for ${stageLabel}. Thank you!`);
        } catch (err) {
          appendMessage('agent', `Failed to upload file: ${err.message}`);
        } finally {
          if (uploadBtn) { uploadBtn.classList.remove('uploading'); uploadBtn.disabled = false; }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function updateSopIndicators() {
    document.querySelectorAll('.sme-stage-pill').forEach(pill => {
      const stage = pill.dataset.stage;
      let check = pill.querySelector('.sme-sop-check');
      if (sopFiles[stage]) {
        if (!check) {
          check = document.createElement('span');
          check.className = 'sme-sop-check';
          check.title = `SOP: ${sopFiles[stage].filename}`;
          check.innerHTML = '&#10003;';
          pill.appendChild(check);
        }
      } else if (check) {
        check.remove();
      }
    });
  }

  // ── Chat input ─────────────────────────────────────────────────────

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

    // Update stage label in header
    const label = document.querySelector('.sme-progress-label');
    if (label && state?.current_stage) {
      label.textContent = STAGE_LABELS[state.current_stage] || state.current_stage.replace(/_/g, ' ');
    }

    // Update active pill
    if (state?.current_stage) {
      document.querySelectorAll('.sme-stage-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.stage === state.current_stage);
      });
    }
  }

  function showInterviewFinished() {
    const pctEl = document.getElementById('progress-pct');
    const fill = document.getElementById('progress-fill');
    const label = document.querySelector('.sme-progress-label');
    if (pctEl) pctEl.textContent = '100%';
    if (fill) fill.style.width = '100%';
    if (label) label.textContent = 'Complete';

    const banner = document.getElementById('help-banner');
    if (banner) banner.remove();

    // Disable stage pills
    document.querySelectorAll('.sme-stage-pill, .sme-sop-upload-btn').forEach(btn => {
      btn.disabled = true;
    });

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
