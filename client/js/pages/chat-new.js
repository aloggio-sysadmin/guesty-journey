import { chat as chatApi, sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';
import { startTour } from '../components/walkthrough.js';
import { JOURNEYS, getJourney, getSelectedJourney, setSelectedJourney, renderJourneySelector } from '../config/journeys.js';

const CHAT_NEW_TOUR = [
  {
    selector: '.page-header',
    title: 'SME Management',
    text: 'This is your hub for managing Subject Matter Experts and starting interview sessions. You can register new SMEs or launch sessions with existing ones.',
    position: 'bottom'
  },
  {
    selector: '#new-sme-form',
    title: 'Register a New SME',
    text: 'Fill in the expert\'s details here. Selecting a role auto-suggests the relevant journey stages. No session starts yet — you can send an interview link after registering.',
    position: 'right'
  },
  {
    selector: '#sme-select-area',
    title: 'Start with an Existing SME',
    text: 'Select an already-registered SME and click "Start Session" to begin an AI-guided interview immediately.',
    position: 'left'
  }
];

function getConfig() {
  const jType = getSelectedJourney();
  const journey = getJourney(jType);
  return {
    journeyType: jType,
    journey,
    ROLE_STAGE_MAP: journey.roleStageMap,
    ROLES: Object.keys(journey.roleStageMap),
    STAGES: journey.stages,
  };
}

export default async function renderChatNew(container) {
  let cfg = getConfig();

  function buildRoleOptions() {
    return cfg.ROLES.map(r => `<option value="${r}">${r}</option>`).join('') + '<option value="__other__">Other</option>';
  }
  function buildStageCheckboxes() {
    return cfg.STAGES.map(s => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:normal;color:var(--text-primary);cursor:help" title="${s.tip}"><input type="checkbox" name="stage" value="${s.id}"> ${s.label}</label>`).join('');
  }

  container.innerHTML = `
    <div class="page-header"><h2>SME Management</h2></div>
    <div class="page-body">
      <div id="journey-selector-area"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:900px">
        <div class="card">
          <div class="card-title">Register New SME</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px">Add a new Subject Matter Expert to the register. No session will be started.</p>
          <form id="new-sme-form">
            <div class="form-group"><label>Full Name *</label><input class="form-control" id="sme-name" required></div>
            <div class="form-group"><label>Role *</label>
              <select class="form-control" id="sme-role" required>
                <option value="">Select a role...</option>
                ${buildRoleOptions()}
              </select>
              <input class="form-control" id="sme-role-other" placeholder="Enter custom role" style="display:none;margin-top:6px">
            </div>
            <div class="form-group"><label>Department</label><input class="form-control" id="sme-dept" placeholder="e.g. Operations"></div>
            <div class="form-group"><label>Email *</label><input class="form-control" type="email" id="sme-email" placeholder="sme@company.com" required></div>
            <div class="form-group"><label>Location</label><input class="form-control" id="sme-loc"></div>
            <div class="form-group"><label>Journey Stages</label>
              <div id="stage-checkboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
                ${buildStageCheckboxes()}
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

      <div class="card" style="max-width:900px;margin-top:24px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="card-title">Import from Zoho People</div>
            <p style="color:var(--text-secondary);font-size:13px;margin:0">Fetch employees in approved roles for the selected journey and register them as SMEs.</p>
          </div>
          <button class="btn btn-primary" id="import-zoho-btn">Fetch Employees</button>
        </div>
        <div id="zoho-import-area" style="margin-top:16px"></div>
      </div>
    </div>`;

  // Render journey selector pills
  renderJourneySelector(container.querySelector('#journey-selector-area'), (newType) => {
    // Re-render the whole page when journey changes
    renderChatNew(container);
  });

  // Role dropdown → auto-select journey stages
  const roleSelect = container.querySelector('#sme-role');
  const roleOther = container.querySelector('#sme-role-other');
  roleSelect.addEventListener('change', () => {
    const val = roleSelect.value;
    roleOther.style.display = val === '__other__' ? '' : 'none';
    if (val === '__other__') { roleOther.focus(); return; }
    const mapped = cfg.ROLE_STAGE_MAP[val];
    if (!mapped) return;
    container.querySelectorAll('input[name="stage"]').forEach(cb => {
      cb.checked = mapped.includes(cb.value);
    });
  });

  // Import from Zoho People
  container.querySelector('#import-zoho-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#import-zoho-btn');
    const area = container.querySelector('#zoho-import-area');
    btn.disabled = true; btn.textContent = 'Fetching...';
    area.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    try {
      const data = await smeApi.fetchZohoPeople(cfg.journeyType);
      const employees = data.employees || [];
      if (!employees.length) {
        area.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">No employees found matching approved roles.</p>';
        btn.disabled = false; btn.textContent = 'Fetch Employees';
        return;
      }
      area.innerHTML = `
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${data.matched_count} employee(s) found matching approved roles (out of ${data.total_employees} total)</div>
        <div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <thead><tr style="background:var(--bg-secondary);position:sticky;top:0">
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)"><input type="checkbox" id="zoho-select-all"></th>
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)">Name</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)">Email</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)">Role</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)">Department</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)">Zoho Status</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)">Import</th>
            </tr></thead>
            <tbody>${employees.map((emp, i) => {
              const noEmail = !emp.email;
              const disabled = emp.already_registered || noEmail;
              const zohoStatus = emp.employee_status || '--';
              const statusColor = zohoStatus.toLowerCase() === 'active' ? 'var(--success)' : 'var(--text-secondary)';
              return `
              <tr style="border-bottom:1px solid var(--border)${disabled ? ';opacity:0.5' : ''}" ${noEmail ? 'title="No email address — cannot import"' : ''}>
                <td style="padding:6px 10px"><input type="checkbox" class="zoho-emp-cb" data-idx="${i}" ${disabled ? 'disabled' : ''}></td>
                <td style="padding:6px 10px">${emp.full_name || '--'}</td>
                <td style="padding:6px 10px">${emp.email || '<span style="color:var(--error);font-size:11px">Missing</span>'}</td>
                <td style="padding:6px 10px">${emp.matched_role || emp.designation || '--'}</td>
                <td style="padding:6px 10px">${emp.department || '--'}</td>
                <td style="padding:6px 10px"><span style="color:${statusColor};font-size:12px">${zohoStatus}</span></td>
                <td style="padding:6px 10px">${emp.already_registered ? '<span style="color:var(--success);font-weight:600">Registered</span>' : noEmail ? '<span style="color:var(--error)">No email</span>' : '<span style="color:var(--text-secondary)">New</span>'}</td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
          <span style="font-size:12px;color:var(--text-secondary)" id="zoho-selected-count">0 selected</span>
          <button class="btn btn-success" id="zoho-import-selected-btn" disabled>Import Selected as SMEs</button>
        </div>`;

      // Store employee data for import
      area._employees = employees;

      // Select all toggle
      area.querySelector('#zoho-select-all').addEventListener('change', (e) => {
        area.querySelectorAll('.zoho-emp-cb:not(:disabled)').forEach(cb => { cb.checked = e.target.checked; });
        updateZohoCount(area);
      });
      area.querySelectorAll('.zoho-emp-cb').forEach(cb => cb.addEventListener('change', () => updateZohoCount(area)));

      // Import selected
      area.querySelector('#zoho-import-selected-btn').addEventListener('click', async () => {
        const importBtn = area.querySelector('#zoho-import-selected-btn');
        importBtn.disabled = true; importBtn.textContent = 'Importing...';
        const selected = [...area.querySelectorAll('.zoho-emp-cb:checked')].map(cb => employees[cb.dataset.idx]);
        let imported = 0;
        for (const emp of selected) {
          try {
            const stages = cfg.ROLE_STAGE_MAP[emp.matched_role] || [];
            await smeApi.create({
              full_name: emp.full_name,
              role: emp.matched_role || emp.designation,
              department: emp.department || '',
              location: emp.location || '',
              journey_type: cfg.journeyType,
              contact_json: { email: emp.email },
              journey_stages_owned_json: stages,
            });
            imported++;
          } catch (err) {
            console.error(`Failed to import ${emp.full_name}:`, err.message);
          }
        }
        toast(`Imported ${imported} of ${selected.length} employees as SMEs`, 'success');
        // Refresh page to show new SMEs in session dropdown
        renderChatNew(container);
      });

    } catch (err) {
      area.innerHTML = `<p style="color:var(--error);font-size:13px">${err.message}</p>`;
    }
    btn.disabled = false; btn.textContent = 'Fetch Employees';
  });

  // Load existing SMEs for the session dropdown
  try {
    const smes = await smeApi.list();
    const area = document.getElementById('sme-select-area');
    if (smes.length === 0) {
      area.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">No SMEs registered yet. Register one using the form first.</p>';
    } else {
      const sorted = smes.sort((a, b) => a.full_name.localeCompare(b.full_name));
      const roles = ['', ...new Set(sorted.map(s => s.role).filter(Boolean))].sort();

      area.innerHTML = `
        <select class="form-control" id="role-filter-select" style="margin-bottom:8px">
          <option value="">All roles</option>
          ${roles.filter(r => r).map(r => `<option value="${r}">${r}</option>`).join('')}
        </select>
        <select class="form-control" id="sme-select" style="margin-bottom:12px">
          <option value="">Select an SME...</option>
          ${sorted.map(s => `<option value="${s.sme_id}" data-role="${s.role || ''}">${s.full_name} (${s.interview_status})</option>`).join('')}
        </select>
        <button class="btn btn-primary" style="width:100%" id="start-existing-btn">Start Session</button>`;

      // Role filter → narrows SME dropdown
      area.querySelector('#role-filter-select').addEventListener('change', (e) => {
        const selectedRole = e.target.value;
        const smeSelect = area.querySelector('#sme-select');
        smeSelect.value = '';
        [...smeSelect.options].forEach(opt => {
          if (!opt.value) return; // keep placeholder
          opt.hidden = selectedRole ? opt.dataset.role !== selectedRole : false;
        });
      });

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

  setTimeout(() => startTour('chat_new', CHAT_NEW_TOUR), 300);

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
        role: roleSelect.value === '__other__' ? roleOther.value : roleSelect.value,
        department: container.querySelector('#sme-dept').value || '',
        location: container.querySelector('#sme-loc').value || '',
        journey_type: cfg.journeyType,
        contact_json: { email },
        journey_stages_owned_json: stages,
      });
      toast(`SME "${newSme.full_name}" registered successfully`, 'success');
      // Show send-link prompt
      showSendLinkPrompt(container, newSme);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Register SME';
    }
  });
}

function updateZohoCount(area) {
  const checked = area.querySelectorAll('.zoho-emp-cb:checked').length;
  area.querySelector('#zoho-selected-count').textContent = `${checked} selected`;
  area.querySelector('#zoho-import-selected-btn').disabled = checked === 0;
}

function showSendLinkPrompt(container, sme) {
  const email = sme.contact_json?.email || '';
  // Replace the registration form card with the prompt
  const formCard = container.querySelector('#new-sme-form').closest('.card');
  formCard.innerHTML = `
    <div style="text-align:center;padding:24px 16px">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3 style="margin:0 0 4px;font-size:18px;color:var(--text-primary)">${sme.full_name}</h3>
      <p style="color:var(--text-secondary);font-size:13px;margin:0 0 20px">Registered successfully</p>
      <p style="color:var(--text-primary);font-size:14px;margin:0 0 20px">Would you like to send the interview link to <strong>${email}</strong> now?</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-primary" id="send-link-now-btn">Send Interview Link</button>
        <button class="btn btn-ghost" id="skip-link-btn">Skip for Now</button>
      </div>
    </div>`;

  formCard.querySelector('#send-link-now-btn').addEventListener('click', async () => {
    const btn = formCard.querySelector('#send-link-now-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      await smeApi.sendLink(sme.sme_id);
      toast('Interview link sent!', 'success');
      window.location.hash = `#/sme/${sme.sme_id}`;
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Send Interview Link';
    }
  });

  formCard.querySelector('#skip-link-btn').addEventListener('click', () => {
    window.location.hash = `#/sme/${sme.sme_id}`;
  });
}
