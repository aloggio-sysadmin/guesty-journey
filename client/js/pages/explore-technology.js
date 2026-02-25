import { tech as techApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderTechnology(container) {
  container.innerHTML = `<div class="page-header"><h2>Technology Ecosystem</h2></div><div class="page-body"><div class="filter-bar"><select class="form-control" id="cat-filter"><option value="">All categories</option>${['PMS','CRM','Channel Manager','Accounting','Communication','Operations','Compliance','Analytics','Other'].map(c=>`<option value="${c}">${c}</option>`).join('')}</select></div><div id="tech-grid"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  let all = [];
  try { all = await techApi.list(); render(all); } catch(e) { toast(e.message,'error'); }
  container.querySelector('#cat-filter').addEventListener('change', ()=>{
    const cat = container.querySelector('#cat-filter').value;
    render(all.filter(s=>!cat||s.category===cat));
  });
  function render(systems) {
    document.getElementById('tech-grid').innerHTML = systems.length===0?`<div class="empty-state"><div class="empty-icon">💻</div><p>No systems documented yet</p></div>`:
    `<div class="tech-grid">${systems.map(s=>`<div class="tech-card">
      <h4>${s.system_name}</h4><div class="vendor">${s.vendor||''} · <span class="badge badge-gray">${s.category}</span></div>
      <div class="integrations">Integrations: ${(s.integration_links_json||[]).length}</div>
      ${s.manual_workarounds_json?.length?`<div style="margin-top:8px"><span class="badge badge-amber">Has workarounds</span></div>`:''}
    </div>`).join('')}</div>`;
  }
}
