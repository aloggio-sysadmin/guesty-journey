import { chat as chatApi, sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';

const STAGES = ['discovery','booking','pre_arrival','check_in','in_stay','check_out','post_stay','re_engagement'];

export default async function renderChatNew(container) {
  container.innerHTML = `
    <div class="page-header"><h2>Start New Session</h2></div>
    <div class="page-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px">
        <div class="card">
          <div class="card-title">Select Existing SME</div>
          <div id="sme-select-area"><div class="loading-center"><div class="spinner"></div></div></div>
        </div>
        <div class="card">
          <div class="card-title">Or Create New SME</div>
          <form id="new-sme-form">
            <div class="form-group"><label>Full Name *</label><input class="form-control" id="sme-name" required></div>
            <div class="form-group"><label>Role *</label><input class="form-control" id="sme-role" required placeholder="e.g. Front Desk Manager"></div>
            <div class="form-group"><label>Department</label><input class="form-control" id="sme-dept" placeholder="e.g. Operations"></div>
            <div class="form-group"><label>Email</label><input class="form-control" type="email" id="sme-email" placeholder="sme@company.com"></div>
            <div class="form-group"><label>Location</label><input class="form-control" id="sme-loc"></div>
            <div class="form-group"><label>Journey Stages</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
                ${STAGES.map(s => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:normal;color:var(--text-primary)"><input type="checkbox" name="stage" value="${s}"> ${s.replace(/_/g,' ')}</label>`).join('')}
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%" id="create-btn">Create & Start Session</button>
          </form>
        </div>
      </div>
    </div>`;

  // Load existing SMEs
  try {
    const smes = await smeApi.list();
    const area = document.getElementById('sme-select-area');
    if (smes.length === 0) {
      area.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">No SMEs registered yet. Create one using the form →</p>';
    } else {
      area.innerHTML = `
        <select class="form-control" id="sme-select" style="margin-bottom:12px">
          <option value="">Select an SME...</option>
          ${smes.map(s => `<option value="${s.sme_id}">${s.full_name} — ${s.role || ''} (${s.interview_status})</option>`).join('')}
        </select>
        <button class="btn btn-primary" style="width:100%" id="start-existing-btn">Start Session</button>`;
      area.querySelector('#start-existing-btn').addEventListener('click', async () => {
        const sme_id = area.querySelector('#sme-select').value;
        if (!sme_id) { toast('Please select an SME', 'warning'); return; }
        await startSession({ sme_id });
      });
    }
  } catch (e) {
    document.getElementById('sme-select-area').innerHTML = `<p style="color:var(--error)">${e.message}</p>`;
  }

  container.querySelector('#new-sme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const stages = [...container.querySelectorAll('input[name="stage"]:checked')].map(c => c.value);
    const sme_email = container.querySelector('#sme-email').value.trim();
    await startSession({
      sme_name: container.querySelector('#sme-name').value,
      sme_role: container.querySelector('#sme-role').value,
      sme_department: container.querySelector('#sme-dept').value,
      sme_location: container.querySelector('#sme-loc').value,
      sme_email: sme_email || undefined,
      journey_stages: stages
    });
  });

  async function startSession(data) {
    const btn = container.querySelector('#create-btn') || container.querySelector('#start-existing-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Starting...'; }
    try {
      const res = await chatApi.start(data);
      window.location.hash = `#/chat/${res.session_id}`;
    } catch (err) {
      toast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = btn.id === 'create-btn' ? 'Create & Start Session' : 'Start Session'; }
    }
  }
}
