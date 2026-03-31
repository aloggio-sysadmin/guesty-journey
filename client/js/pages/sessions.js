import { chat as chatApi } from '../api.js';
import { toast } from '../components/toast.js';
import { sortData, thSort, attachSort } from '../utils/table.js';
import { startTour } from '../components/walkthrough.js';
import { getSelectedJourney, renderJourneySelector } from '../config/journeys.js';

const SESSIONS_TOUR = [
  {
    selector: '.page-header',
    title: 'Interview Sessions',
    text: 'This page lists all AI-guided interview sessions. Each session captures insights from a subject matter expert across one or more journey stages.',
    position: 'bottom'
  },
  {
    selector: '.filter-bar',
    title: 'Filter & Search',
    text: 'Filter sessions by SME name, journey stage, or status (active, paused, closed). Combine filters to find what you need quickly.',
    position: 'bottom'
  },
  {
    selector: '#sessions-table-wrap',
    title: 'Sessions Table',
    text: 'Click "Resume" to continue an active session, or "View" to review a closed one. Closed sessions can also be deleted here.',
    position: 'top'
  }
];

export default async function renderSessions(container) {
  container.innerHTML = `
    <div class="page-header"><h2>Sessions</h2><div class="page-actions"><a href="#/chat/new" class="btn btn-primary">+ New Session</a></div></div>
    <div class="page-body">
      <div id="journey-selector-area"></div>
      <div class="filter-bar" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <input class="form-control search-input" id="search" placeholder="Search by SME name..." style="min-width:180px">
        <select class="form-control" id="stage-filter"><option value="">All stages</option></select>
        <select class="form-control" id="status-filter">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
        <button class="btn btn-sm" id="clear-filters-btn" style="display:none;white-space:nowrap">Clear filters</button>
      </div>
      <div id="sessions-table-wrap"><div class="loading-center"><div class="spinner"></div></div></div>
    </div>`;

  renderJourneySelector(container.querySelector('#journey-selector-area'), () => renderSessions(container));

  let sessions = [];
  const sort = { key: null, dir: 'asc' };

  try {
    sessions = await chatApi.listSessions();
    populateStages(sessions);
    renderTable();
  } catch (e) { toast(e.message, 'error'); }

  setTimeout(() => startTour('sessions', SESSIONS_TOUR), 300);

  container.querySelector('#search').addEventListener('input', renderTable);
  container.querySelector('#stage-filter').addEventListener('change', renderTable);
  container.querySelector('#status-filter').addEventListener('change', renderTable);
  container.querySelector('#clear-filters-btn').addEventListener('click', () => {
    container.querySelector('#search').value = '';
    container.querySelector('#stage-filter').value = '';
    container.querySelector('#status-filter').value = '';
    renderTable();
  });

  function populateStages(data) {
    const stages = [...new Set(data.map(s => s.current_stage).filter(Boolean))].sort();
    const sel = container.querySelector('#stage-filter');
    stages.forEach(st => { const o = document.createElement('option'); o.value = st; o.textContent = st; sel.appendChild(o); });
  }

  function filtered() {
    const search = container.querySelector('#search').value.toLowerCase();
    const stage  = container.querySelector('#stage-filter').value;
    const status = container.querySelector('#status-filter').value;
    const hasFilters = search || stage || status;
    container.querySelector('#clear-filters-btn').style.display = hasFilters ? '' : 'none';
    return sessions.filter(s =>
      (!search || (s.sme_name || '').toLowerCase().includes(search)) &&
      (!stage  || s.current_stage === stage) &&
      (!status || s.status === status)
    );
  }

  function renderTable() {
    const data = sortData(filtered(), sort.key, sort.dir);
    const wrap = container.querySelector('#sessions-table-wrap');
    wrap.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr>
      <th>Session ID</th>
      ${thSort(sort, 'sme_name',         'SME')}
      ${thSort(sort, 'current_stage',    'Stage')}
      ${thSort(sort, 'status',           'Status')}
      ${thSort(sort, 'session_date',     'Date')}
      ${thSort(sort, 'duration_minutes', 'Duration')}
      <th>Action</th>
    </tr></thead><tbody>
      ${data.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">No sessions found</td></tr>`
        : data.map(s => `<tr>
            <td><code style="font-size:12px">${s.session_id}</code></td>
            <td>${s.sme_name || '-'}</td>
            <td><span class="badge badge-blue">${s.current_stage || '-'}</span></td>
            <td><span class="badge ${s.status === 'active' ? 'badge-green' : s.status === 'paused' ? 'badge-amber' : 'badge-gray'}">${s.status}</span></td>
            <td>${s.session_date ? new Date(s.session_date).toLocaleDateString() : '-'}</td>
            <td>${s.duration_minutes ? s.duration_minutes + ' min' : '-'}</td>
            <td style="display:flex;gap:6px;align-items:center">
              <a href="#/chat/${s.session_id}" class="btn btn-sm ${s.status !== 'closed' ? 'btn-primary' : 'btn-ghost'}">${s.status === 'closed' ? 'View' : 'Resume'}</a>
              ${s.status === 'closed' ? `<button class="btn btn-sm btn-danger delete-session-btn" data-id="${s.session_id}">Delete</button>` : ''}
            </td>
          </tr>`).join('')}
    </tbody></table></div></div>`;

    attachSort(wrap, sort, renderTable);

    wrap.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm(`Delete session ${id} and its chat history? This cannot be undone.`)) return;
        btn.disabled = true; btn.textContent = 'Deleting...';
        try {
          await chatApi.deleteSession(id);
          toast('Session deleted', 'success');
          sessions = sessions.filter(s => s.session_id !== id);
          renderTable();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false; btn.textContent = 'Delete';
        }
      });
    });
  }
}
