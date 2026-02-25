import { gaps as gapsApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderGaps(container) {
  container.innerHTML = `<div class="page-header"><h2>Gaps & Opportunities</h2></div><div class="page-body"><div class="filter-bar"><select class="form-control" id="status-filter"><option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select><select class="form-control" id="impact-filter"><option value="">All impact</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div><div id="gaps-table"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  let all = [];
  try { all = await gapsApi.list(); render(all); } catch(e) { toast(e.message,'error'); }
  container.querySelector('#status-filter').addEventListener('change', filter);
  container.querySelector('#impact-filter').addEventListener('change', filter);
  function filter() {
    const status = container.querySelector('#status-filter').value;
    const impact = container.querySelector('#impact-filter').value;
    render(all.filter(g=>(!status||g.status===status)&&(!impact||g.guest_impact===impact)));
  }
  function render(gaps) {
    document.getElementById('gaps-table').innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Guest Impact</th><th>Frequency</th><th>Status</th></tr></thead><tbody>
      ${gaps.length===0?`<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary)">No gaps found</td></tr>`:
      gaps.map(g=>`<tr>
        <td><code>${g.gap_id}</code></td><td><strong>${g.title}</strong>${g.description?`<div style="font-size:12px;color:var(--text-secondary)">${g.description.slice(0,80)}${g.description.length>80?'...':''}</div>`:''}</td>
        <td><span class="badge badge-purple">${g.gap_type||'-'}</span></td>
        <td><span class="badge ${g.guest_impact==='critical'?'badge-red':g.guest_impact==='high'?'badge-amber':g.guest_impact==='medium'?'badge-blue':'badge-gray'}">${g.guest_impact||'-'}</span></td>
        <td>${g.frequency||'-'}</td>
        <td><span class="badge ${g.status==='resolved'?'badge-green':g.status==='open'?'badge-amber':'badge-gray'}">${g.status||'-'}</span></td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
  }
}
