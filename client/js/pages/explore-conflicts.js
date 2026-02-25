import { conflicts as conflictsApi } from '../api.js';
import { toast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
export default async function renderConflicts(container) {
  container.innerHTML = `<div class="page-header"><h2>Conflict Log</h2></div><div class="page-body"><div class="filter-bar"><select class="form-control" id="status-filter"><option value="">All</option><option value="unresolved">Unresolved</option><option value="resolved">Resolved</option></select></div><div id="conflicts-table"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  let all = [];
  try { all = await conflictsApi.list(); render(all); } catch(e) { toast(e.message,'error'); }
  container.querySelector('#status-filter').addEventListener('change', ()=>{
    const s = container.querySelector('#status-filter').value;
    render(all.filter(c=>!s||c.resolution_status===s));
  });
  function render(items) {
    document.getElementById('conflicts-table').innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Type</th><th>Description</th><th>SME A</th><th>SME B</th><th>Status</th><th></th></tr></thead><tbody>
      ${items.length===0?`<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">No conflicts found</td></tr>`:
      items.map(c=>`<tr>
        <td><code>${c.conflict_id}</code></td>
        <td><span class="badge badge-amber">${c.type}</span></td>
        <td style="max-width:200px">${c.description.slice(0,80)}</td>
        <td>${c.sme_a_id||'-'}</td><td>${c.sme_b_id||'-'}</td>
        <td><span class="badge ${c.resolution_status==='resolved'?'badge-green':'badge-red'}">${c.resolution_status}</span></td>
        <td>${c.resolution_status==='unresolved'?`<button class="btn btn-sm btn-secondary" onclick="resolveConflict('${c.conflict_id}')">Resolve</button>`:''}</td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
  }
  window.resolveConflict = (id) => {
    const c = all.find(x=>x.conflict_id===id);
    let notes = '';
    showModal({ title: 'Resolve Conflict', body: `<p style="margin-bottom:12px">${c?.description||''}</p><div class="form-group"><label>Resolution Notes</label><textarea class="form-control" id="resolve-notes" rows="4" placeholder="Describe how this conflict was resolved..."></textarea></div>`,
      actions: [
        { id: 'cancel', label: 'Cancel', class: 'btn-ghost' },
        { id: 'resolve', label: 'Mark Resolved', class: 'btn-success', handler: async () => {
          notes = document.getElementById('resolve-notes')?.value || 'Resolved';
          try { await conflictsApi.resolve(id, notes); toast('Conflict resolved','success'); const fresh = await conflictsApi.list(); all = fresh; render(fresh); } catch(e) { toast(e.message,'error'); }
        }}
      ]
    });
  };
}
