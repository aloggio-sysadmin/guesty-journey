export function showModal({ title, body, size = '', actions = [] }) {
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-footer">${actions.map(a =>
        `<button class="btn ${a.class || 'btn-ghost'}" data-action="${a.id}">${a.label}</button>`
      ).join('')}</div>` : ''}
    </div>`;

  const close = () => { backdrop.remove(); };
  backdrop.querySelector('#modal-close-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  for (const a of actions) {
    const btn = backdrop.querySelector(`[data-action="${a.id}"]`);
    if (btn && a.handler) btn.addEventListener('click', () => { a.handler(); close(); });
  }

  root.appendChild(backdrop);
  return { close };
}

export function showConfirm(message, onConfirm) {
  const { close } = showModal({
    title: 'Confirm',
    body: `<p>${message}</p>`,
    actions: [
      { id: 'cancel', label: 'Cancel', class: 'btn-ghost' },
      { id: 'confirm', label: 'Confirm', class: 'btn-danger', handler: onConfirm }
    ]
  });
}
