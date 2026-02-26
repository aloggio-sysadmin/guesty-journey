import { sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderSmeDetail(container, params) {
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const data = await smeApi.get(params.id);
    const email = data.contact_json?.email || '';
    container.innerHTML = `<div class="page-header"><h2><a href="#/sme" style="color:var(--text-secondary)">SMEs</a> / ${data.full_name}</h2>
      <div class="page-actions">${data.interview_status === 'completed' ? `<button class="btn btn-success" id="validate-btn">✓ Validate SME</button>` : ''}
      ${email ? `<button class="btn btn-primary" id="send-link-btn">Send Interview Link</button>` : ''}
      <a href="#/chat/new?sme_id=${data.sme_id}" class="btn btn-ghost">+ Admin Session</a></div></div>
    <div class="page-body">
      <div class="card" style="margin-bottom:16px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          <div><strong>ID</strong><div>${data.sme_id}</div></div>
          <div><strong>Role</strong><div>${data.role || '-'}</div></div>
          <div><strong>Department</strong><div>${data.department || '-'}</div></div>
          <div><strong>Location</strong><div>${data.location || '-'}</div></div>
          <div><strong>Email</strong><div>${email || '<span style="color:var(--text-secondary)">Not set</span>'}</div></div>
          <div><strong>Status</strong><div><span class="badge ${data.interview_status === 'link_sent' ? 'badge-amber' : 'badge-blue'}">${data.interview_status}</span></div></div>
          <div><strong>Stages Owned</strong><div>${(Array.isArray(data.journey_stages_owned_json) ? data.journey_stages_owned_json : []).join(', ') || '-'}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Sessions</div>
        ${(data.sessions || []).length === 0 ? '<p style="color:var(--text-secondary)">No sessions yet</p>' :
        `<div class="table-wrap"><table><thead><tr><th>Session</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>
          ${data.sessions.map(s => `<tr><td><code>${s.session_id}</code></td><td><span class="badge badge-gray">${s.status}</span></td><td>${s.session_date ? new Date(s.session_date).toLocaleDateString() : '-'}</td><td><a href="#/chat/${s.session_id}" class="btn btn-sm btn-ghost">View</a></td></tr>`).join('')}
        </tbody></table></div>`}
      </div>
    </div>`;
    const vBtn = container.querySelector('#validate-btn');
    if (vBtn) vBtn.addEventListener('click', async () => {
      try { await smeApi.validate(data.sme_id); toast('SME validated', 'success'); window.location.reload(); } catch (e) { toast(e.message, 'error'); }
    });
    const slBtn = container.querySelector('#send-link-btn');
    if (slBtn) slBtn.addEventListener('click', async () => {
      slBtn.disabled = true; slBtn.textContent = 'Sending...';
      try {
        const res = await smeApi.sendLink(data.sme_id);
        toast(res.message || 'Interview link sent!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (e) { toast(e.message, 'error'); slBtn.disabled = false; slBtn.textContent = 'Send Interview Link'; }
    });
  } catch (e) { container.innerHTML = `<div class="page-body"><div class="card"><p style="color:var(--error)">${e.message}</p></div></div>`; }
}
