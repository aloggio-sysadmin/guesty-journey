import { chat as chatApi, sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';

const STAGES = [
  { id: 'discovery',      label: 'Discovery',      tip: 'Guest researches options, reads reviews, compares properties' },
  { id: 'booking',        label: 'Booking',         tip: 'Guest selects dates, makes a reservation, receives confirmation' },
  { id: 'pre_arrival',    label: 'Pre-arrival',     tip: 'Guest receives pre-stay communications, special requests, upsells' },
  { id: 'check_in',       label: 'Check-in',        tip: 'Guest arrives, identity verification, room assignment, key handover' },
  { id: 'in_stay',        label: 'In-stay',         tip: 'Guest experience during the stay — housekeeping, concierge, dining, activities' },
  { id: 'check_out',      label: 'Check-out',       tip: 'Guest settles bill, returns keys, arranges transport, departure' },
  { id: 'post_stay',      label: 'Post-stay',       tip: 'Guest receives follow-up, review requests, loyalty programme communications' },
  { id: 're_engagement',  label: 'Re-engagement',   tip: 'Returning guest outreach, special offers, win-back campaigns' },
];

export default async function renderChatNew(container) {
  container.innerHTML = `
    <div class="page-header"><h2>SME Management</h2></div>
    <div class="page-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px">
        <div class="card">
          <div class="card-title">Register New SME</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">Add a new Subject Matter Expert to the register. No session will be started.</p>
          <form id="new-sme-form">
            <div class="form-group"><label>Full Name *</label><input class="form-control" id="sme-name" required></div>
            <div class="form-group"><label>Role *</label><input class="form-control" id="sme-role" required placeholder="e.g. Front Desk Manager"></div>
            <div class="form-group"><label>Department</label><input class="form-control" id="sme-dept" placeholder="e.g. Operations"></div>
            <div class="form-group"><label>Email</label><input class="form-control" type="email" id="sme-email" placeholder="sme@company.com"></div>
            <div class="form-group"><label>Location</label><input class="form-control" id="sme-loc"></div>
            <div class="form-group"><label>Journey Stages</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
                ${STAGES.map(s => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:normal;color:var(--text-primary);cursor:help" title="${s.tip}"><input type="checkbox" name="stage" value="${s.id}"> ${s.label}</label>`).join('')}
              </div>
            </div>
            <button type="submit" class="btn btn-success" style="width:100%" id="register-btn">Register SME</button>
          </form>
        </div>
        <div class="card">
          <div class="card-title">Start Interview Session</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">Select a registered SME to begin an admin-led interview session.</p>
          <div id="sme-select-area"><div class="loading-center"><div class="spinner"></div></div></div>
        </div>
      </div>
    </div>`;

  // Load existing SMEs for the session dropdown
  try {
    const smes = await smeApi.list();
    const area = document.getElementById('sme-select-area');
    if (smes.length === 0) {
      area.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">No SMEs registered yet. Register one using the form first.</p>';
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
        const btn = area.querySelector('#start-existing-btn');
        btn.disabled = true; btn.textContent = 'Starting...';
        try {
          const res = await chatApi.start({ sme_id });
          window.location.hash = `#/chat/${res.session_id}`;
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = 'Start Session';
        }
      });
    }
  } catch (e) {
    document.getElementById('sme-select-area').innerHTML = `<p style="color:var(--error)">${e.message}</p>`;
  }

  // Register SME form — creates SME only, no session
  container.querySelector('#new-sme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = container.querySelector('#register-btn');
    btn.disabled = true; btn.textContent = 'Registering...';
    const stages = [...container.querySelectorAll('input[name="stage"]:checked')].map(c => c.value);
    const email = container.querySelector('#sme-email').value.trim();
    try {
      const newSme = await smeApi.create({
        full_name: container.querySelector('#sme-name').value,
        role: container.querySelector('#sme-role').value,
        department: container.querySelector('#sme-dept').value || '',
        location: container.querySelector('#sme-loc').value || '',
        contact_json: email ? { email } : {},
        journey_stages_owned_json: stages,
      });
      toast(`SME "${newSme.full_name}" registered successfully`, 'success');
      window.location.hash = `#/sme/${newSme.sme_id}`;
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Register SME';
    }
  });
}
