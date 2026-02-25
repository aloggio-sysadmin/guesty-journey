import { getUser, clearAuth } from '../auth.js';

export function renderNav(container) {
  const user = getUser();
  if (!user) { container.innerHTML = ''; return; }

  const currentHash = window.location.hash || '#/dashboard';

  const isActive = (hash) => currentHash.startsWith(hash) ? 'active' : '';

  container.innerHTML = `
    <div class="sidebar-logo">
      <h1>🗺️ Journey Agent</h1>
      <p>Guest Journey Mapping</p>
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
}
