import { sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderSmeList(container) {
  container.innerHTML = `<div class="page-header"><h2>SME Register</h2></div><div class="page-body"><div class="filter-bar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><select class="form-control" id="status-filter"><option value="">All statuses</option><option value="pending">Pending</option><option value="link_sent">Link Sent</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="validated">Validated</option></select><input class="form-control search-input" id="search" placeholder="Search by name..."><div style="margin-left:auto;display:flex;align-items:center;gap:8px" id="bulk-actions" style="display:none"><span style="font-size:12px;color:var(--text-secondary)" id="selected-count">0 selected</span><button class="btn btn-primary btn-sm" id="bulk-send-btn" disabled>Send Interview Links</button></div></div><div id="sme-table"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  let allSmes = [];
  const selectedIds = new Set();

  try { allSmes = await smeApi.list(); render(allSmes); } catch (e) { toast(e.message, 'error'); }
  container.querySelector('#status-filter').addEventListener('change', filter);
  container.querySelector('#search').addEventListener('input', filter);

  // Bulk send button
  container.querySelector('#bulk-send-btn').addEventListener('click', async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const smesWithEmail = allSmes.filter(s => ids.includes(s.sme_id) && s.contact_json?.email);
    const smesNoEmail = allSmes.filter(s => ids.includes(s.sme_id) && !s.contact_json?.email);

    let msg = `Send interview links to ${smesWithEmail.length} SME(s)?`;
    if (smesNoEmail.length > 0) {
      msg += `\n\n${smesNoEmail.length} SME(s) will be skipped (no email): ${smesNoEmail.map(s => s.full_name).join(', ')}`;
    }
    if (!confirm(msg)) return;

    const btn = container.querySelector('#bulk-send-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      const res = await smeApi.bulkSendLinks(ids);
      const failed = res.results.filter(r => !r.success);
      if (failed.length === 0) {
        toast(`Interview links sent to ${res.sent} SME(s)`, 'success');
      } else {
        toast(`Sent ${res.sent} of ${res.total}. ${res.failed} failed.`, 'warning');
        console.warn('[bulk-send] Failures:', failed);
      }
      // Refresh the list to reflect updated statuses
      selectedIds.clear();
      allSmes = await smeApi.list();
      filter();
    } catch (err) {
      toast(err.message, 'error');
    }
    btn.disabled = false; btn.textContent = 'Send Interview Links';
    updateBulkActions();
  });

  function updateBulkActions() {
    const bulkBar = container.querySelector('#bulk-actions');
    const countEl = container.querySelector('#selected-count');
    const sendBtn = container.querySelector('#bulk-send-btn');
    if (selectedIds.size > 0) {
      bulkBar.style.display = '';
      countEl.textContent = `${selectedIds.size} selected`;
      sendBtn.disabled = false;
    } else {
      bulkBar.style.display = 'none';
      sendBtn.disabled = true;
    }
  }

  function filter() {
    const status = container.querySelector('#status-filter').value;
    const search = container.querySelector('#search').value.toLowerCase();
    render(allSmes.filter(s => (!status || s.interview_status === status) && (!search || s.full_name.toLowerCase().includes(search))));
  }

  function render(smes) {
    function statusBadge(status) {
      const cls = status === 'validated' ? 'badge-green' : status === 'completed' ? 'badge-blue' : status === 'in_progress' ? 'badge-amber' : status === 'link_sent' ? 'badge-amber' : 'badge-gray';
      return `<span class="badge ${cls}">${status}</span>`;
    }
    const hasEmail = (s) => !!(s.contact_json?.email);
    document.getElementById('sme-table').innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr>
      <th style="width:36px"><input type="checkbox" id="select-all-sme"></th>
      <th>ID</th><th>Name</th><th>Role</th><th>Email</th><th>Department</th><th>Status</th><th></th></tr></thead><tbody>
      ${smes.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary)">No SMEs found</td></tr>` :
      smes.map(s => `<tr>
        <td><input type="checkbox" class="sme-cb" data-id="${s.sme_id}" ${selectedIds.has(s.sme_id) ? 'checked' : ''} ${!hasEmail(s) ? 'disabled title="No email address"' : ''}></td>
        <td style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'"><code>${s.sme_id}</code></td><td style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'"><strong>${s.full_name}</strong></td><td>${s.role || '-'}</td><td>${s.contact_json?.email || '<span style="color:var(--error);font-size:12px">Missing</span>'}</td><td>${s.department || '-'}</td>
        <td>${statusBadge(s.interview_status)}</td>
        <td><button class="btn btn-sm btn-danger delete-sme-btn" data-id="${s.sme_id}" data-name="${s.full_name}">Delete</button></td>
      </tr>`).join('')}
    </tbody></table></div></div>`;

    // Select all checkbox
    const selectAll = document.getElementById('select-all-sme');
    if (selectAll) {
      selectAll.checked = smes.length > 0 && smes.filter(s => hasEmail(s)).every(s => selectedIds.has(s.sme_id));
      selectAll.addEventListener('change', (e) => {
        smes.forEach(s => {
          if (!hasEmail(s)) return;
          if (e.target.checked) { selectedIds.add(s.sme_id); } else { selectedIds.delete(s.sme_id); }
        });
        document.querySelectorAll('.sme-cb:not(:disabled)').forEach(cb => { cb.checked = e.target.checked; });
        updateBulkActions();
      });
    }

    // Individual checkboxes
    document.querySelectorAll('.sme-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) { selectedIds.add(cb.dataset.id); } else { selectedIds.delete(cb.dataset.id); }
        // Update select-all state
        const allCbs = document.querySelectorAll('.sme-cb:not(:disabled)');
        const allChecked = [...allCbs].every(c => c.checked);
        if (selectAll) selectAll.checked = allCbs.length > 0 && allChecked;
        updateBulkActions();
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-sme-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const name = btn.dataset.name;
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
