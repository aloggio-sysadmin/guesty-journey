import { project, chat as chatApi } from '../api.js';
import { progressRing } from '../components/progress-ring.js';
import { toast } from '../components/toast.js';

export default async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Dashboard</h2>
      <div class="page-actions">
        <a href="#/chat/new" class="btn btn-primary">+ New Session</a>
      </div>
    </div>
    <div class="page-body">
      <div id="stats-area"><div class="loading-center"><div class="spinner"></div></div></div>
      <div id="sessions-area" style="margin-top:24px"></div>
    </div>`;

  try {
    const [state, sessions] = await Promise.all([
      project.recalculate(),
      chatApi.listSessions()
    ]);
    const c = state.completion || {};
    const smesPct = c.smes_identified ? Math.round((c.smes_interviewed / c.smes_identified) * 100) : 0;
    const stagesPct = Math.round((c.journey_stages_mapped / 8) * 100);

    document.getElementById('stats-area').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card ${c.smes_interviewed === c.smes_identified && c.smes_identified > 0 ? 'success' : ''}">
          <div class="stat-label">SMEs Interviewed</div>
          <div class="stat-value">${c.smes_interviewed || 0}</div>
          <div class="stat-sub">of ${c.smes_identified || 0} identified</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Journey Stages Mapped</div>
          <div class="stat-value">${c.journey_stages_mapped || 0}</div>
          <div class="stat-sub">of 8 total stages</div>
        </div>
        <div class="stat-card ${c.gaps_identified > 0 ? 'warning' : ''}">
          <div class="stat-label">Open Gaps</div>
          <div class="stat-value">${(c.gaps_identified || 0) - (c.gaps_resolved || 0)}</div>
          <div class="stat-sub">${c.gaps_resolved || 0} resolved</div>
        </div>
        <div class="stat-card ${c.conflicts_open > 0 ? 'danger' : ''}">
          <div class="stat-label">Open Conflicts</div>
          <div class="stat-value">${c.conflicts_open || 0}</div>
          <div class="stat-sub">require resolution</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">Overall Completion</div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="text-align:center">${progressRing(stagesPct, 80, 7)}<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">Stages</div></div>
          <div style="text-align:center">${progressRing(smesPct, 80, 7)}<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">SMEs</div></div>
          <div style="flex:1;min-width:200px">
            <div style="margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Processes documented</span><strong>${c.processes_documented || 0}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Gaps identified</span><strong>${c.gaps_identified || 0}</strong></div>
              <div style="display:flex;justify-content:space-between;font-size:12px"><span>SMEs validated</span><strong>${c.smes_validated || 0}</strong></div>
            </div>
          </div>
        </div>
      </div>`;

    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'paused');
    const recentSessions = sessions.slice(0, 10);
    document.getElementById('sessions-area').innerHTML = `
      <div class="card">
        <div class="card-title">Recent Sessions</div>
        ${recentSessions.length === 0 ? `<div class="empty-state"><div class="empty-icon">💬</div><p>No sessions yet</p><a href="#/chat/new" class="btn btn-primary">Start First Session</a></div>` :
        `<div class="table-wrap"><table>
          <thead><tr><th>Session</th><th>SME</th><th>Stage</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>${recentSessions.map(s => `
            <tr>
              <td><code style="font-size:12px">${s.session_id}</code></td>
              <td>${s.sme_name || '-'}</td>
              <td><span class="badge badge-blue">${s.current_stage || '-'}</span></td>
              <td><span class="badge ${s.status === 'active' ? 'badge-green' : s.status === 'paused' ? 'badge-amber' : 'badge-gray'}">${s.status}</span></td>
              <td>${s.session_date ? new Date(s.session_date).toLocaleDateString() : '-'}</td>
              <td><a href="#/chat/${s.session_id}" class="btn btn-sm ${s.status === 'active' || s.status === 'paused' ? 'btn-primary' : 'btn-ghost'}">${s.status === 'closed' ? 'View' : 'Resume'}</a></td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
      </div>`;
  } catch (err) {
    toast(err.message, 'error');
    document.getElementById('stats-area').innerHTML = `<div class="card"><p style="color:var(--error)">${err.message}</p></div>`;
  }
}
