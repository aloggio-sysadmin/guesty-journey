import { journey as journeyApi } from '../api.js';
import { toast } from '../components/toast.js';
const STAGES = ['discovery','booking','pre_arrival','check_in','in_stay','check_out','post_stay','re_engagement'];
export default async function renderJourneyOverview(container) {
  container.innerHTML = `<div class="page-header"><h2>Journey Map</h2></div><div class="page-body"><div class="loading-center"><div class="spinner"></div></div></div>`;
  try {
    const stages = await journeyApi.list();
    const map = Object.fromEntries(stages.map(s => [s.journey_stage, s]));
    container.querySelector('.page-body').innerHTML = `
      <p style="color:var(--text-secondary);margin-bottom:20px">Click a stage to explore its details.</p>
      <div class="journey-timeline">
        ${STAGES.map(s => {
          const data = map[s];
          const cls = data ? (data.guest_actions_json?.length > 0 ? 'mapped' : 'partial') : '';
          return `<div class="stage-card-mini ${cls}" onclick="window.location.hash='#/journey/${s}'">
            <div class="stage-name">${s.replace(/_/g,' ')}</div>
            <div class="stage-counts">${data ? `${(data.frontstage_interactions_json||[]).length} touchpoints` : 'Not mapped'}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-title">All Stages</div>
        <div class="table-wrap"><table><thead><tr><th>Stage</th><th>Description</th><th>Processes</th><th>Tech Touchpoints</th><th>Failure Points</th><th></th></tr></thead><tbody>
          ${STAGES.map(s => { const d = map[s]; return `<tr>
            <td><strong>${s.replace(/_/g,' ')}</strong></td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${d?.stage_description || '-'}</td>
            <td>${d ? (d.backstage_processes_json||[]).length : 0}</td>
            <td>${d ? (d.technology_touchpoints_json||[]).length : 0}</td>
            <td>${d ? (d.failure_points_json||[]).length : 0}</td>
            <td><a href="#/journey/${s}" class="btn btn-sm btn-ghost">Explore</a></td>
          </tr>`; }).join('')}
        </tbody></table></div>
      </div>`;
  } catch (e) { toast(e.message, 'error'); }
}
