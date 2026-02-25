import { sme as smeApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderSmeList(container) {
  container.innerHTML = `<div class="page-header"><h2>SME Register</h2></div><div class="page-body"><div class="filter-bar"><select class="form-control" id="status-filter"><option value="">All statuses</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="validated">Validated</option></select><input class="form-control search-input" id="search" placeholder="Search by name..."></div><div id="sme-table"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
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
    document.getElementById('sme-table').innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Status</th></tr></thead><tbody>
      ${smes.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-secondary)">No SMEs found</td></tr>` :
      smes.map(s => `<tr style="cursor:pointer" onclick="window.location.hash='#/sme/${s.sme_id}'">
        <td><code>${s.sme_id}</code></td><td><strong>${s.full_name}</strong></td><td>${s.role || '-'}</td><td>${s.department || '-'}</td>
        <td><span class="badge ${s.interview_status === 'validated' ? 'badge-green' : s.interview_status === 'completed' ? 'badge-blue' : s.interview_status === 'in_progress' ? 'badge-amber' : 'badge-gray'}">${s.interview_status}</span></td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
  }
}
