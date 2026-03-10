import { FONTS_LINK, BASE_CSS, esc, openReportWindow } from './shared-styles.js';

const CAT_COLORS = {
  'Property Management':         { bg: '#D6E4F0', h: '#2E75B6' },
  'OTAs & Distribution':         { bg: '#E2EFDA', h: '#2A5A2E' },
  'Booking Engines':             { bg: '#D6E4F0', h: '#2E75B6' },
  'Channel Managers':            { bg: '#E2EFDA', h: '#2A5A2E' },
  'Customer Experience':         { bg: '#FCE4D6', h: '#C0562A' },
  'Reviews & Reputation':        { bg: '#FCE4D6', h: '#C0562A' },
  'Dynamic Pricing':             { bg: '#EAF2FB', h: '#1A5276' },
  'Websites & Brand':            { bg: '#F4CCFF', h: '#4A0080' },
  'Operations':                  { bg: '#DBEEF4', h: '#1A5276' },
  'Accounting & Payroll':        { bg: '#FFF2CC', h: '#7A5000' },
  'Payment Gateways':            { bg: '#FFF2CC', h: '#7A5000' },
  'Data & Analytics':            { bg: '#FFF9DB', h: '#6B5000' },
  'Marketing & Advertising':     { bg: '#EAD1DC', h: '#5B2880' },
  'Security & Compliance':       { bg: '#FDECEA', h: '#7B0000' },
  'Productivity & Collaboration':{ bg: '#D9EAD3', h: '#1A5225' },
  'Developer & IT':              { bg: '#F3E5F5', h: '#4A1060' },
  'Learning Management':         { bg: '#D9EAD3', h: '#1A5225' },
};

function getCatColor(cat) {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  for (const [k, v] of Object.entries(CAT_COLORS)) {
    if (cat.toLowerCase().includes(k.toLowerCase().split(' ')[0])) return v;
  }
  return { bg: '#E2E8F0', h: '#4A5568' };
}

export function generateTechLandscape(data) {
  const systems = data.systems || [];
  const cats = {};
  for (const s of systems) {
    if (!cats[s.category]) cats[s.category] = [];
    cats[s.category].push(s);
  }
  const catNames = Object.keys(cats).sort();

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Technology Landscape</title>
${FONTS_LINK}
<style>
${BASE_CSS}
.search-bar { margin-bottom: 24px; }
.search-input {
  width: 100%; padding: 12px 18px; font-family: 'DM Sans', sans-serif; font-size: 14px;
  border: 2px solid var(--border); border-radius: 10px; background: #fff; color: var(--ink); outline: none;
}
.search-input:focus { border-color: var(--mid); }
.cat-section { margin-bottom: 24px; }
.cat-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 10px 10px 0 0;
  border: 1px solid var(--border); border-bottom: none;
  cursor: pointer; user-select: none; background: #fff;
}
.cat-header .cat-dot { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; }
.cat-header .cat-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.cat-header .cat-count { font-size: 12px; color: var(--mid-grey); margin-left: auto; font-family: 'DM Mono', monospace; }
.cat-header .cat-arrow { font-size: 12px; color: var(--mid-grey); transition: transform 0.2s; }
.cat-header.collapsed .cat-arrow { transform: rotate(-90deg); }
.cat-body {
  background: #fff; border: 1px solid var(--border); border-top: none;
  border-radius: 0 0 10px 10px; overflow: hidden;
}
.cat-body.hidden { display: none; }
.app-row {
  display: grid; grid-template-columns: 200px 140px 1fr 120px 180px;
  border-bottom: 1px solid var(--border); padding: 12px 18px; align-items: center; gap: 12px;
  transition: background 0.1s;
}
.app-row:last-child { border-bottom: none; }
.app-row:hover { background: #F8FAFE; }
.app-name { font-size: 13px; font-weight: 600; color: var(--navy); }
.app-vendor { font-size: 12px; color: var(--ink2); }
.app-env { font-size: 11px; color: var(--mid-grey); }
.app-details { font-size: 11.5px; color: var(--ink2); line-height: 1.5; }
.stage-pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
  background: var(--light); color: var(--mid); margin: 1px 2px;
}
.workaround-flag { color: var(--crit); font-size: 11px; font-weight: 600; }
</style>
</head><body>

<div class="page-header">
  <div class="header-inner">
    <div class="header-title">
      <h1>Guest Journey Mapping</h1>
      <h2>Technology <span>Landscape</span></h2>
    </div>
    <div class="header-meta">
      Generated: ${new Date().toLocaleString()}<br>
      Live data from system
    </div>
  </div>
</div>

<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat-item"><div class="stat-num">${data.system_count || 0}</div><div class="stat-lbl">Systems</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.category_count || 0}</div><div class="stat-lbl">Categories</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.total_integrations || 0}</div><div class="stat-lbl">Integrations</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.workaround_count || 0}</div><div class="stat-lbl">Workarounds</div></div>
  </div>
</div>

<div class="main">
  <div class="search-bar">
    <input class="search-input" type="text" placeholder="Search systems, vendors, categories..." id="searchInput">
  </div>

  <div id="categories">
  ${catNames.map(cat => {
    const col = getCatColor(cat);
    const apps = cats[cat];
    return `
    <div class="cat-section" data-cat="${esc(cat)}">
      <div class="cat-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('hidden')">
        <div class="cat-dot" style="background:${col.h}"></div>
        <span class="cat-name">${esc(cat)}</span>
        <span class="cat-count">${apps.length}</span>
        <span class="cat-arrow">&#9660;</span>
      </div>
      <div class="cat-body">
        <div class="app-row" style="background:${col.bg};font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${col.h}">
          <div>System</div><div>Vendor</div><div>Details</div><div>Environment</div><div>Journey Stages</div>
        </div>
        ${apps.map(a => `
        <div class="app-row" data-search="${esc((a.system_name+' '+a.vendor+' '+a.category).toLowerCase())}">
          <div>
            <div class="app-name">${esc(a.system_name)}</div>
            ${a.manual_workarounds.length ? '<div class="workaround-flag">Has workarounds</div>' : ''}
          </div>
          <div class="app-vendor">${esc(a.vendor)}</div>
          <div class="app-details">
            ${a.integration_links.length ? `<div>${a.integration_links.length} integration(s)</div>` : ''}
            ${a.manual_workarounds.length ? `<div>${a.manual_workarounds.length} workaround(s)</div>` : ''}
          </div>
          <div class="app-env">${esc(a.environment)}</div>
          <div>${a.journey_stages.map(s => `<span class="stage-pill">${esc(s)}</span>`).join('') || '<span style="color:var(--mid-grey)">--</span>'}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('')}
  </div>
</div>

<script>
document.getElementById('searchInput').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll('.app-row[data-search]').forEach(row => {
    row.style.display = !q || row.dataset.search.includes(q) ? '' : 'none';
  });
  document.querySelectorAll('.cat-section').forEach(sec => {
    const visible = sec.querySelectorAll('.app-row[data-search]:not([style*="none"])').length;
    sec.style.display = !q || visible > 0 ? '' : 'none';
  });
});
</script>
</body></html>`;

  openReportWindow(html, 'Technology Landscape');
}
