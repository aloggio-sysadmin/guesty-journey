import { process as processApi } from '../api.js';
import { toast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
const STAGES = ['discovery','booking','pre_arrival','check_in','in_stay','check_out','post_stay','re_engagement'];
export default async function renderProcesses(container) {
  container.innerHTML = `<div class="page-header"><h2>Process Inventory</h2></div><div class="page-body"><div class="filter-bar"><select class="form-control" id="stage-filter"><option value="">All stages</option>${STAGES.map(s=>`<option value="${s}">${s.replace(/_/g,' ')}</option>`).join('')}</select><select class="form-control" id="maturity-filter"><option value="">All maturity</option><option value="ad_hoc">Ad hoc</option><option value="documented">Documented</option><option value="standardised">Standardised</option><option value="optimised">Optimised</option></select></div><div id="process-table"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  let all = [];
  try { all = await processApi.list(); render(all); } catch (e) { toast(e.message,'error'); }
  container.querySelector('#stage-filter').addEventListener('change', filter);
  container.querySelector('#maturity-filter').addEventListener('change', filter);
  function filter() {
    const stage = container.querySelector('#stage-filter').value;
    const mat = container.querySelector('#maturity-filter').value;
    render(all.filter(p => (!stage||p.journey_stage===stage)&&(!mat||p.maturity===mat)));
  }
  function render(procs) {
    document.getElementById('process-table').innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Stage</th><th>Maturity</th><th>Owner</th><th>Discrepancy</th></tr></thead><tbody>
      ${procs.length===0?`<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-secondary)">No processes found</td></tr>`:
      procs.map(p=>`<tr style="cursor:pointer" onclick="showProcessDetail('${p.process_id}')">
        <td><code>${p.process_id}</code></td><td><strong>${p.process_name}</strong></td>
        <td><span class="badge badge-blue">${p.journey_stage}</span></td>
        <td><span class="badge ${p.maturity==='optimised'?'badge-green':p.maturity==='standardised'?'badge-blue':'badge-amber'}">${p.maturity||'ad_hoc'}</span></td>
        <td>${p.owner_sme_id||'-'}</td>
        <td>${p.discrepancy_flag?'<span class="badge badge-red">⚠ Yes</span>':'<span class="badge badge-gray">No</span>'}</td>
      </tr>`).join('')}
    </tbody></table></div></div>`;
  }
  window.showProcessDetail = async (id) => {
    const p = all.find(x=>x.process_id===id);
    if (!p) return;
    showModal({ title: p.process_name, size: 'lg', body: `
      <p><strong>Stage:</strong> ${p.journey_stage} | <strong>Maturity:</strong> ${p.maturity||'ad_hoc'}</p>
      ${p.as_documented?`<p style="margin-top:12px"><strong>As Documented:</strong><br>${p.as_documented}</p>`:''}
      ${p.as_practiced?`<p style="margin-top:8px"><strong>As Practiced:</strong><br>${p.as_practiced}</p>`:''}
      ${p.discrepancy_flag?`<div class="conflict-block" style="margin-top:8px"><div class="block-label">⚠ Discrepancy</div>${p.discrepancy_notes||''}</div>`:''}
      <p style="margin-top:12px"><strong>Steps:</strong></p>
      <ul style="margin-top:6px;padding-left:18px">${(Array.isArray(p.steps_json)?p.steps_json:[]).map(s=>`<li>${s.description||JSON.stringify(s)}</li>`).join('')||'<li>None recorded</li>'}</ul>`
    });
  };
}
