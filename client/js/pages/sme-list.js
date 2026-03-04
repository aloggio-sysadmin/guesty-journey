import { sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderSmeList(container) {
  container.innerHTML = `<div class="page-header"><h2>SME Register</h2></div><div class="page-body"><div class="filter-bar"><select class="form-control" id="status-filter"><option value="">All statuses</option><option value="pending">Pending</option><option value="link_sent">Link Sent</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="validated">Validated</option></select><input class="form-control search-input" id="search" placeholder="Search by name..."></div><div id="sme-table"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  let allSmes = [];
  try { allSmes = await smeApi.list(); render(allSmes); } catch (e) { toast(e.message, 'error'); }
  container.querySelector('#status-filter').addEventListener('change', filter);
  container.querySelector('#search').addEventListener('input', filter);
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
    document.getElementById('sme-table').innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Email</th><th>Department</th><th>Status</th><th></th></tr></thead><tbody>
      ${smes.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">No SMEs found</td></tr>` :
      smes.map(s => `<tr>
        <td style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'"><code>${s.sme_id}</code></td><td style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'"><strong>${s.full_name}</strong></td><td>${s.role || '-'}</td><td>${s.contact_json?.email || '-'}</td><td>${s.department || '-'}</td>
        <td>${statusBadge(s.interview_status)}</td>
        <td><button class="btn btn-sm btn-danger delete-sme-btn" data-id="${s.sme_id}" data-name="${s.full_name}">Delete</button></td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
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
          filter();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = 'Delete';
        }
      });
    });
  }
}
