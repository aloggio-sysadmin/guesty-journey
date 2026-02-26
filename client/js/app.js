import { isLoggedIn } from './auth.js';
import { renderNav } from './components/nav.js';

const routes = {
  '#/login':               () => import('./pages/login.js'),
  '#/dashboard':           () => import('./pages/dashboard.js'),
  '#/chat/new':            () => import('./pages/chat-new.js'),
  '#/chat/:id':            () => import('./pages/chat.js'),
  '#/sessions':            () => import('./pages/sessions.js'),
  '#/sme':                 () => import('./pages/sme-list.js'),
  '#/sme/:id':             () => import('./pages/sme-detail.js'),
  '#/journey':             () => import('./pages/journey-overview.js'),
  '#/journey/:stage':      () => import('./pages/journey-stage.js'),
  '#/explore/processes':   () => import('./pages/explore-processes.js'),
  '#/explore/technology':  () => import('./pages/explore-technology.js'),
  '#/explore/gaps':        () => import('./pages/explore-gaps.js'),
  '#/explore/conflicts':   () => import('./pages/explore-conflicts.js'),
  '#/reports':             () => import('./pages/reports.js'),
  '#/admin/users':         () => import('./pages/admin-users.js'),
  '#/interview/:token':    () => import('./pages/sme-interview.js'),
};

function parseHash(hash) {
  for (const pattern of Object.keys(routes)) {
    const params = matchPattern(pattern, hash);
    if (params !== null) return { pattern, params };
  }
  return null;
}

function matchPattern(pattern, hash) {
  const pp = pattern.split('/');
  const hp = hash.split('/');
  if (pp.length !== hp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = hp[i];
    else if (pp[i] !== hp[i]) return null;
  }
  return params;
}

async function navigate() {
  const hash = window.location.hash || '#/dashboard';
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('content');

  // Handle login page
  if (hash === '#/login' || hash === '#/login') {
    sidebar.style.display = 'none';
    content.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    const mod = await import('./pages/login.js');
    mod.default(content);
    return;
  }

  // Handle SME interview page (public, no login required)
  if (hash.startsWith('#/interview/')) {
    sidebar.style.display = 'none';
    content.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
    const match = parseHash(hash);
    if (match) {
      try {
        const mod = await routes[match.pattern]();
        mod.default(content, match.params);
      } catch (e) {
        content.innerHTML = `<div class="page-body"><div class="card"><p style="color:var(--error)">Failed to load: ${e.message}</p></div></div>`;
      }
    }
    return;
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn()) {
    window.location.hash = '#/login';
    return;
  }

  sidebar.style.display = 'flex';
  renderNav(sidebar);

  const match = parseHash(hash);
  if (!match) {
    content.innerHTML = '<div class="page-body"><h2>Page not found</h2></div>';
    return;
  }

  content.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const mod = await routes[match.pattern]();
    mod.default(content, match.params);
  } catch (e) {
    console.error('Route load error:', e);
    content.innerHTML = `<div class="page-body"><div class="card"><p style="color:var(--error)">Failed to load page: ${e.message}</p></div></div>`;
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// Hamburger for mobile
const hamburger = document.createElement('button');
hamburger.className = 'hamburger';
hamburger.textContent = '☰';
hamburger.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.body.appendChild(hamburger);
