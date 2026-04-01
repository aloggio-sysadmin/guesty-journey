import { getUser, clearAuth } from '../auth.js';
import { JOURNEYS, JOURNEY_TYPES, getSelectedJourney, setSelectedJourney, applyJourneyTheme } from '../config/journeys.js';

export function renderNav(container) {
  const user = getUser();
  if (!user) { container.innerHTML = ''; return; }

  const currentHash = window.location.hash || '#/dashboard';
  const selectedJourney = getSelectedJourney();
  const journey = JOURNEYS[selectedJourney] || JOURNEYS.guest;

  const isActive = (hash) => currentHash.startsWith(hash) ? 'active' : '';

  container.innerHTML = `
    <div class="sidebar-logo">
      <h1>🗺️ Journey Agent</h1>
      <p>${journey.label}</p>
    </div>
    <div class="sidebar-journey-picker">
      <select id="journey-select" style="width:100%;padding:8px 10px;background:#334155;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:6px;font-size:13px;font-family:inherit;cursor:pointer;appearance:auto">
        ${JOURNEY_TYPES.map(t => `<option value="${t}" ${t === selectedJourney ? 'selected' : ''}>${JOURNEYS[t].label}</option>`).join('')}
      </select>
    </div>
    <nav class="sidebar-nav">
      <div class="sidebar-section">Main</div>
      <a href="#/dashboard" class="nav-item ${isActive('#/dashboard')}"><span class="icon">📊</span> Dashboard</a>
      <a href="#/chat/new" class="nav-item ${isActive('#/chat/new')}"><span class="icon">💬</span> New Session</a>
      <div class="sidebar-section">Interviews</div>
      <a href="#/sessions" class="nav-item ${isActive('#/sessions')}"><span class="icon">📋</span> Sessions</a>
      <a href="#/sme" class="nav-item ${isActive('#/sme')}"><span class="icon">👤</span> SME Register</a>
      <div class="sidebar-section">Explore</div>
      <a href="#/journey" class="nav-item ${isActive('#/journey')}"><span class="icon">🗺️</span> Journey Map</a>
      <a href="#/explore/processes" class="nav-item ${isActive('#/explore/processes')}"><span class="icon">⚙️</span> Processes</a>
      <a href="#/explore/technology" class="nav-item ${isActive('#/explore/technology')}"><span class="icon">💻</span> Technology</a>
      <a href="#/explore/gaps" class="nav-item ${isActive('#/explore/gaps')}"><span class="icon">🔍</span> Gaps & Opportunities</a>
      <a href="#/explore/conflicts" class="nav-item ${isActive('#/explore/conflicts')}"><span class="icon">⚠️</span> Conflicts</a>
      <div class="sidebar-section">Outputs</div>
      <a href="#/reports" class="nav-item ${isActive('#/reports')}"><span class="icon">📄</span> Reports</a>
      ${user.role === 'admin' ? `<div class="sidebar-section">Admin</div>
      <a href="#/admin/users" class="nav-item ${isActive('#/admin/users')}"><span class="icon">👥</span> User Management</a>` : ''}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <strong>${user.full_name || user.email}</strong>
        ${user.role}
      </div>
      <button class="btn-logout" id="logout-btn">Sign Out</button>
    </div>`;

  container.querySelector('#logout-btn').addEventListener('click', () => {
    clearAuth();
    window.location.hash = '#/login';
  });

  container.querySelector('#journey-select').addEventListener('change', (e) => {
    setSelectedJourney(e.target.value);
    applyJourneyTheme(e.target.value);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
