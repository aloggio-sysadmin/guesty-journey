import { journey as journeyApi } from '../api.js';
import { toast } from '../components/toast.js';
export default async function renderJourneyStage(container, params) {
  const stage = params.stage;
  container.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    let data;
    const list = await journeyApi.list();
    data = list.find(s => s.journey_stage === stage);
    if (!data) { container.innerHTML = `<div class="page-header"><h2><a href="#/journey">Journey</a> / ${stage.replace(/_/g,' ')}</h2></div><div class="page-body"><div class="card"><p>Stage not mapped yet. Data will appear here after interviews.</p></div></div>`; return; }
    const sect = (title, items, fn) => items && items.length > 0 ? `<div style="margin-bottom:16px"><strong>${title}</strong><ul style="margin-top:6px;padding-left:18px">${items.map(fn || (i => `<li>${JSON.stringify(i)}</li>`)).join('')}</ul></div>` : `<div style="margin-bottom:16px"><strong>${title}</strong><p style="color:var(--text-secondary);font-size:13px">Not yet mapped</p></div>`;
    container.innerHTML = `<div class="page-header"><h2><a href="#/journey">Journey</a> / ${stage.replace(/_/g,' ')}</h2></div>
    <div class="page-body">
      <div class="card">
        <div class="card-title">Stage Overview</div>
        <p>${data.stage_description || 'No description yet'}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
        <div class="card">${sect('Guest Actions', data.guest_actions_json, i => `<li>${typeof i === 'string' ? i : JSON.stringify(i)}</li>`)}</div>
        <div class="card">${sect('Frontstage Interactions', data.frontstage_interactions_json, i => `<li>${typeof i === 'object' ? (i.description || JSON.stringify(i)) : i}</li>`)}</div>
        <div class="card">${sect('Backstage Processes', data.backstage_processes_json, i => `<li>${typeof i === 'object' ? (i.description || JSON.stringify(i)) : i}</li>`)}</div>
        <div class="card">${sect('Technology Touchpoints', data.technology_touchpoints_json, i => `<li>${typeof i === 'object' ? (i.system_name || JSON.stringify(i)) : i}</li>`)}</div>
        <div class="card" style="grid-column:1/-1">${sect('Failure Points / Gaps', data.failure_points_json, i => `<li style="color:var(--error)">${typeof i === 'object' ? (i.description || JSON.stringify(i)) : i}</li>`)}</div>
      </div>
    </div>`;
  } catch (e) { container.innerHTML = `<div class="page-body"><div class="card"><p style="color:var(--error)">${e.message}</p></div></div>`; }
}
