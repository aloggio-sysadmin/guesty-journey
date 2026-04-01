import { sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';
import { sortData, thSort, attachSort } from '../utils/table.js';
import { startTour } from '../components/walkthrough.js';
import { getSelectedJourney } from '../config/journeys.js';

const SME_TOUR = [
  {
    selector: '.page-header',
    title: 'SME Register',
    text: 'This is your Subject Matter Expert register. Each SME represents a staff member with knowledge of one or more guest journey stages.',
    position: 'bottom'
  },
  {
    selector: '.filter-bar',
    title: 'Filter & Bulk Actions',
    text: 'Search by name, filter by role, department, or status. Select multiple SMEs to send interview links in bulk.',
    position: 'bottom'
  },
  {
    selector: '#sme-table',
    title: 'SME Table',
    text: 'Click any row to view an SME\'s profile and interview history. Status badges show progress from "Pending" through to "Validated".',
    position: 'top'
  }
];

export default async function renderSmeList(container) {
  container.innerHTML = `
    <div class="page-header"><h2>SME Register</h2></div>
    <div class="page-body">
      <div class="filter-bar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <input class="form-control search-input" id="search" placeholder="Search by name..." style="min-width:180px">
        <select class="form-control" id="role-filter"><option value="">All roles</option></select>
        <select class="form-control" id="dept-filter"><option value="">All departments</option></select>
        <select class="form-control" id="status-filter">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="link_sent">Link Sent</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="validated">Validated</option>
        </select>
        <button class="btn btn-sm" id="clear-filters-btn" style="white-space:nowrap;display:none">Clear filters</button>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px" id="bulk-actions" style="display:none">
          <span style="font-size:12px;color:var(--text-secondary)" id="selected-count">0 selected</span>
          <button class="btn btn-primary btn-sm" id="bulk-send-btn" disabled>Send Interview Links</button>
        </div>
      </div>
      <div id="sme-table"><div class="loading-center"><div class="spinner"></div></div></div>
    </div>`;

  let allSmes = [];
  const selectedIds = new Set();
  const sort = { key: null, dir: 'asc' };

  try {
    allSmes = await smeApi.list('journey_type=' + getSelectedJourney());
    populateFilterOptions(allSmes);
    filter();
  } catch (e) { toast(e.message, 'error'); }

  setTimeout(() => startTour('sme', SME_TOUR), 300);

  container.querySelector('#search').addEventListener('input', filter);
  container.querySelector('#role-filter').addEventListener('change', filter);
  container.querySelector('#dept-filter').addEventListener('change', filter);
  container.querySelector('#status-filter').addEventListener('change', filter);
  container.querySelector('#clear-filters-btn').addEventListener('click', () => {
    container.querySelector('#search').value = '';
    container.querySelector('#role-filter').value = '';
    container.querySelector('#dept-filter').value = '';
    container.querySelector('#status-filter').value = '';
    filter();
  });

  function populateFilterOptions(smes) {
    const roles = [...new Set(smes.map(s => s.role).filter(Boolean))].sort();
    const depts = [...new Set(smes.map(s => s.department).filter(Boolean))].sort();
    const roleSelect = container.querySelector('#role-filter');
    const deptSelect = container.querySelector('#dept-filter');
    roles.forEach(r => { const o = document.createElement('option'); o.value = r; o.textContent = r; roleSelect.appendChild(o); });
    depts.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; deptSelect.appendChild(o); });
  }

  container.querySelector('#bulk-send-btn').addEventListener('click', async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const smesWithEmail = allSmes.filter(s => ids.includes(s.sme_id) && s.contact_json?.email);
    const smesNoEmail   = allSmes.filter(s => ids.includes(s.sme_id) && !s.contact_json?.email);
    let msg = `Send interview links to ${smesWithEmail.length} SME(s)?`;
    if (smesNoEmail.length > 0) msg += `\n\n${smesNoEmail.length} SME(s) will be skipped (no email): ${smesNoEmail.map(s => s.full_name).join(', ')}`;
    if (!confirm(msg)) return;
    const btn = container.querySelector('#bulk-send-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const res = await smeApi.bulkSendLinks(ids);
      if (res.failed === 0) { toast(`Interview links sent to ${res.sent} SME(s)`, 'success'); }
      else { toast(`Sent ${res.sent} of ${res.total}. ${res.failed} failed.`, 'warning'); console.warn('[bulk-send] Failures:', res.results.filter(r => !r.success)); }
      selectedIds.clear();
      allSmes = await smeApi.list('journey_type=' + getSelectedJourney());
      filter();
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Send Interview Links';
    updateBulkActions();
  });

  function updateBulkActions() {
    const bulkBar = container.querySelector('#bulk-actions');
    const countEl = container.querySelector('#selected-count');
    const sendBtn = container.querySelector('#bulk-send-btn');
    if (selectedIds.size > 0) {
      bulkBar.style.display = ''; countEl.textContent = `${selectedIds.size} selected`; sendBtn.disabled = false;
    } else {
      bulkBar.style.display = 'none'; sendBtn.disabled = true;
    }
  }

  function filter() {
    const search = container.querySelector('#search').value.toLowerCase();
    const role   = container.querySelector('#role-filter').value;
    const dept   = container.querySelector('#dept-filter').value;
    const status = container.querySelector('#status-filter').value;
    const hasFilters = search || role || dept || status;
    container.querySelector('#clear-filters-btn').style.display = hasFilters ? '' : 'none';
    const filtered = allSmes.filter(s =>
      (!search || s.full_name.toLowerCase().includes(search)) &&
      (!role   || s.role === role) &&
      (!dept   || s.department === dept) &&
      (!status || s.interview_status === status)
    );
    render(sortData(filtered, sort.key, sort.dir));
  }

  function render(smes) {
    function statusBadge(st) {
      const cls = st === 'validated' ? 'badge-green' : st === 'completed' ? 'badge-blue' : ['in_progress','link_sent'].includes(st) ? 'badge-amber' : 'badge-gray';
      return `<span class="badge ${cls}">${st}</span>`;
    }
    const hasEmail = s => !!(s.contact_json?.email);
    const wrap = document.getElementById('sme-table');
    wrap.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr>
      <th style="width:36px"><input type="checkbox" id="select-all-sme"></th>
      <th>ID</th>
      ${thSort(sort, 'full_name',        'Name')}
      ${thSort(sort, 'role',             'Role')}
      <th>Email</th>
      ${thSort(sort, 'department',       'Department')}
      ${thSort(sort, 'interview_status', 'Status')}
      <th></th>
    </tr></thead><tbody>
      ${smes.length === 0
        ? `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary)">No SMEs found</td></tr>`
        : smes.map(s => `<tr>
            <td><input type="checkbox" class="sme-cb" data-id="${s.sme_id}" ${selectedIds.has(s.sme_id) ? 'checked' : ''} ${!hasEmail(s) ? 'disabled title="No email address"' : ''}></td>
            <td style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'"><code>${s.sme_id}</code></td>
            <td style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'"><strong>${s.full_name}</strong></td>
            <td>${s.role || '-'}</td>
            <td>${s.contact_json?.email || '<span style="color:var(--error);font-size:12px">Missing</span>'}</td>
            <td>${s.department || '-'}</td>
            <td>${statusBadge(s.interview_status)}</td>
            <td><button class="btn btn-sm btn-danger delete-sme-btn" data-id="${s.sme_id}" data-name="${s.full_name}">Delete</button></td>
          </tr>`).join('')}
    </tbody></table></div></div>`;

    attachSort(wrap, sort, filter);

    const selectAll = document.getElementById('select-all-sme');
    if (selectAll) {
      selectAll.checked = smes.length > 0 && smes.filter(s => hasEmail(s)).every(s => selectedIds.has(s.sme_id));
      selectAll.addEventListener('change', e => {
        smes.forEach(s => { if (!hasEmail(s)) return; e.target.checked ? selectedIds.add(s.sme_id) : selectedIds.delete(s.sme_id); });
        document.querySelectorAll('.sme-cb:not(:disabled)').forEach(cb => { cb.checked = e.target.checked; });
        updateBulkActions();
      });
    }

    document.querySelectorAll('.sme-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.checked ? selectedIds.add(cb.dataset.id) : selectedIds.delete(cb.dataset.id);
        const allCbs = document.querySelectorAll('.sme-cb:not(:disabled)');
        if (selectAll) selectAll.checked = allCbs.length > 0 && [...allCbs].every(c => c.checked);
        updateBulkActions();
      });
    });

    document.querySelectorAll('.delete-sme-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const { id, name } = btn.dataset;
        if (!confirm(`Delete SME "${name}"? This will also delete all their sessions and chat history.`)) return;
        btn.disabled = true; btn.textContent = 'Deleting...';
        try {
          await smeApi.remove(id);
          toast(`SME "${name}" deleted`, 'success');
          allSmes = allSmes.filter(s => s.sme_id !== id);
          selectedIds.delete(id);
          updateBulkActions();
          filter();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = 'Delete';
        }
      });
    });

    updateBulkActions();
  }
}
