import { chat as chatApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderSessions(container) {
  container.innerHTML = `<div class="page-header"><h2>Sessions</h2><div class="page-actions"><a href="#/chat/new" class="btn btn-primary">+ New Session</a></div></div><div class="page-body"><div class="loading-center"><div class="spinner"></div></div></div>`;
  let sessions = [];
  try {
    sessions = await chatApi.listSessions();
    renderTable();
  } catch (e) { toast(e.message, 'error'); }

  function renderTable() {
    const body = container.querySelector('.page-body');
    body.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Session ID</th><th>SME</th><th>Stage</th><th>Status</th><th>Date</th><th>Duration</th><th>Action</th></tr></thead><tbody>
      ${sessions.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">No sessions yet</td></tr>` :
      sessions.map(s => `<tr>
        <td><code style="font-size:12px">${s.session_id}</code></td>
        <td>${s.sme_name || '-'}</td>
        <td><span class="badge badge-blue">${s.current_stage || '-'}</span></td>
        <td><span class="badge ${s.status === 'active' ? 'badge-green' : s.status === 'paused' ? 'badge-amber' : 'badge-gray'}">${s.status}</span></td>
        <td>${s.session_date ? new Date(s.session_date).toLocaleDateString() : '-'}</td>
        <td>${s.duration_minutes ? s.duration_minutes + ' min' : '-'}</td>
        <td style="display:flex;gap:6px;align-items:center">
          <a href="#/chat/${s.session_id}" class="btn btn-sm ${s.status !== 'closed' ? 'btn-primary' : 'btn-ghost'}">${s.status === 'closed' ? 'View' : 'Resume'}</a>
          ${s.status === 'closed' ? `<button class="btn btn-sm btn-danger delete-session-btn" data-id="${s.session_id}">Delete</button>` : ''}
        </td>
      </tr>`).join('')}
    </tbody></table></div></div>`;

    body.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm(`Delete session ${id} and its chat history? This cannot be undone.`)) return;
        btn.disabled = true; btn.textContent = 'Deleting...';
        try {
          await chatApi.deleteSession(id);
          toast('Session deleted', 'success');
          sessions = sessions.filter(s => s.session_id !== id);
          renderTable();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = 'Delete';
        }
      });
    });
  }
}
