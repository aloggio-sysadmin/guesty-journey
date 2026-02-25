export function renderMessage({ role, content, timestamp }) {
  const isUser = role === 'user';
  const parsedContent = isUser ? escapeHtml(content) : formatAgentContent(content);
  const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return `
    <div class="msg-row ${isUser ? 'user' : 'agent'}">
      <div class="msg-avatar ${isUser ? 'user' : 'agent'}">${isUser ? '👤' : '🤖'}</div>
      <div>
        <div class="msg-bubble">${parsedContent}</div>
        ${time ? `<div class="msg-time">${time}</div>` : ''}
      </div>
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAgentContent(content) {
  if (!content) return '';
  const lines = content.split('\n');
  let html = '';
  let inExtraction = false;
  let inConflict = false;
  let blockLines = [];

  function flushBlock() {
    if (blockLines.length === 0) return;
    const items = blockLines.map(l => `<div class="block-item">${escapeHtml(l.replace(/^[•\-]\s*/, ''))}</div>`).join('');
    if (inExtraction) html += `<div class="extraction-block"><div class="block-label">📋 Extracted</div>${items}</div>`;
    if (inConflict) html += `<div class="conflict-block"><div class="block-label">⚠️ Conflict</div>${items}</div>`;
    blockLines = [];
    inExtraction = false;
    inConflict = false;
  }

  for (const line of lines) {
    if (line.includes('📋 EXTRACTED:') || line.startsWith('📋')) {
      flushBlock();
      inExtraction = true;
      const rest = line.replace(/📋 EXTRACTED:/i, '').trim();
      if (rest) blockLines.push(rest);
    } else if (line.includes('⚠️ CONFLICT:') || line.startsWith('⚠️')) {
      flushBlock();
      inConflict = true;
      const rest = line.replace(/⚠️ CONFLICT:/i, '').trim();
      if (rest) blockLines.push(rest);
    } else if ((inExtraction || inConflict) && (line.startsWith('•') || line.startsWith('-') || line.startsWith(' '))) {
      if (line.trim()) blockLines.push(line.trim());
    } else {
      flushBlock();
      if (line.trim()) html += `<span>${escapeHtml(line)}</span><br>`;
    }
  }
  flushBlock();
  return html;
}
