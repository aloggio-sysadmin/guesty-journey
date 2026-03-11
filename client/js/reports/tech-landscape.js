import { FONTS_LINK, BASE_CSS, DOWNLOAD_BAR_HTML, esc, openReportWindow } from './shared-styles.js';

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

  // Build journey stage → systems map
  const stageMap = {};
  for (const s of systems) {
    for (const stage of (s.journey_stages || [])) {
      if (!stageMap[stage]) stageMap[stage] = [];
      stageMap[stage].push(s);
    }
  }
  const stageNames = Object.keys(stageMap).sort();

  // Count guest-facing (systems that touch at least one journey stage)
  const guestFacing = systems.filter(s => (s.journey_stages || []).length > 0).length;

  // Journey Stage × Technology Map section
  const journeyMapSection = stageNames.length ? `
  <div class="jt-section">
    <div class="jt-header">
      <div class="jt-title">Journey Stage × Technology Map</div>
      <div class="jt-subtitle">Systems mapped to each guest journey stage</div>
    </div>
    <div class="jt-grid">
      ${stageNames.map(stage => {
        const stageSystems = stageMap[stage];
        return `
        <div class="jt-card">
          <div class="jt-card-header">
            <div class="jt-stage-name">${esc(stage)}</div>
            <div class="jt-stage-count">${stageSystems.length} system${stageSystems.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="jt-card-body">
            ${stageSystems.map(s => {
              const col = getCatColor(s.category);
              return `<span class="jt-sys-pill" style="border-color:${col.h};color:${col.h}">${esc(s.system_name)}</span>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>` : '';

  // Category sections with card grids
  const catSections = catNames.map(cat => {
    const col = getCatColor(cat);
    const apps = cats[cat];
    return `
    <div class="cat-section" data-cat="${esc(cat)}">
      <div class="cat-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('hidden')">
        <div class="cat-accent" style="background:${col.h}"></div>
        <span class="cat-name">${esc(cat)}</span>
        <span class="cat-count">${apps.length}</span>
        <span class="cat-arrow">&#9660;</span>
      </div>
      <div class="cat-body">
        <div class="card-grid">
          ${apps.map(a => {
            const hasWorkarounds = a.manual_workarounds.length > 0;
            const workaroundTexts = a.manual_workarounds.map(w =>
              typeof w === 'string' ? w : (w.description || w.name || JSON.stringify(w))
            );
            return `
          <div class="app-card${hasWorkarounds ? ' has-workaround' : ''}" data-search="${esc((a.system_name+' '+a.vendor+' '+a.category).toLowerCase())}" style="border-top:3px solid ${col.h}">
            <div class="card-top">
              <div class="app-name">${esc(a.system_name)}</div>
              <div class="app-vendor">${esc(a.vendor)}</div>
            </div>
            <div class="card-mid">
              ${a.environment ? `<span class="env-badge">${esc(a.environment)}</span>` : ''}
              ${a.integration_links.length ? `<span class="int-badge">${a.integration_links.length} integration${a.integration_links.length !== 1 ? 's' : ''}</span>` : ''}
              ${hasWorkarounds ? `<span class="wa-badge">${a.manual_workarounds.length} workaround${a.manual_workarounds.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
            ${(a.journey_stages || []).length ? `
            <div class="card-stages">
              ${a.journey_stages.map(s => `<span class="stage-pill">${esc(s)}</span>`).join('')}
            </div>` : ''}
            ${hasWorkarounds ? `
            <div class="card-risk">
              ${workaroundTexts.slice(0, 2).map(t => `<div class="risk-note">${esc(t)}</div>`).join('')}
              ${workaroundTexts.length > 2 ? `<div class="risk-note">+ ${workaroundTexts.length - 2} more</div>` : ''}
            </div>` : ''}
          </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Technology Landscape</title>
${FONTS_LINK}
<style>
${BASE_CSS}
/* Filter & search bar */
.controls-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
.search-input {
  flex: 1; min-width: 200px; padding: 10px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.06); color: #fff; outline: none;
}
.search-input::placeholder { color: rgba(255,255,255,0.35); }
.search-input:focus { border-color: var(--mid); background: rgba(255,255,255,0.1); }
.filter-group { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn {
  padding: 7px 14px; font-family: 'DM Sans', sans-serif; font-size: 11.5px; font-weight: 600;
  letter-spacing: 0.03em; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.65); cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.filter-btn.active { background: var(--mid); border-color: var(--mid); color: #fff; }
/* Journey × Tech map */
.jt-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 32px; }
.jt-header { margin-bottom: 18px; }
.jt-title { font-size: 16px; font-weight: 700; color: #fff; }
.jt-subtitle { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; }
.jt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.jt-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; transition: background 0.15s; }
.jt-card:hover { background: rgba(255,255,255,0.1); }
.jt-card-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.jt-stage-name { font-size: 13px; font-weight: 700; color: #fff; }
.jt-stage-count { font-size: 11px; color: rgba(255,255,255,0.45); font-family: 'DM Mono', monospace; }
.jt-card-body { display: flex; flex-wrap: wrap; gap: 5px; }
.jt-sys-pill {
  display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 600;
  border: 1px solid; background: rgba(255,255,255,0.06);
}
/* Category sections */
.cat-section { margin-bottom: 24px; }
.cat-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 10px 10px 0 0;
  border: 1px solid rgba(255,255,255,0.1); border-bottom: none;
  cursor: pointer; user-select: none; background: rgba(255,255,255,0.04); transition: background 0.15s;
}
.cat-header:hover { background: rgba(255,255,255,0.08); }
.cat-accent { width: 4px; height: 28px; border-radius: 2px; flex-shrink: 0; }
.cat-header .cat-name { font-size: 14px; font-weight: 700; color: #fff; }
.cat-header .cat-count { font-size: 12px; color: rgba(255,255,255,0.45); margin-left: auto; font-family: 'DM Mono', monospace; }
.cat-header .cat-arrow { font-size: 12px; color: rgba(255,255,255,0.35); transition: transform 0.2s; }
.cat-header.collapsed .cat-arrow { transform: rotate(-90deg); }
.cat-body {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-top: none;
  border-radius: 0 0 10px 10px; padding: 16px;
}
.cat-body.hidden { display: none; }
/* Card grid */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.app-card {
  background: #fff; border-radius: 10px; padding: 16px; transition: box-shadow 0.15s, transform 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 10px;
}
.app-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.15); transform: translateY(-2px); }
.app-card.has-workaround { box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(192,57,43,0.2); }
.card-top { }
.app-name { font-size: 14px; font-weight: 700; color: var(--navy); line-height: 1.3; }
.app-vendor { font-size: 11.5px; color: var(--ink2); margin-top: 2px; }
.card-mid { display: flex; flex-wrap: wrap; gap: 5px; }
.env-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
  background: var(--light); color: var(--mid);
}
.int-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
  background: #E2EFDA; color: #2A5A2E;
}
.wa-badge {
  display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
  background: #FDECEA; color: var(--crit);
}
.card-stages { display: flex; flex-wrap: wrap; gap: 4px; }
.stage-pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600;
  background: var(--light); color: var(--mid);
}
.card-risk { border-top: 1px solid var(--border); padding-top: 8px; }
.risk-note { font-size: 11px; color: var(--crit); line-height: 1.5; }
@media (max-width: 768px) {
  .card-grid { grid-template-columns: 1fr; }
  .jt-grid { grid-template-columns: 1fr; }
}
@media print {
  .controls-bar, .jt-section { break-inside: avoid; }
  .app-card { break-inside: avoid; box-shadow: none; border: 1px solid var(--border); }
}
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
    <div class="stat-item"><div class="stat-num">${data.system_count || 0}</div><div class="stat-lbl">Total Apps</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.category_count || 0}</div><div class="stat-lbl">Categories</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.total_integrations || 0}</div><div class="stat-lbl">Integrations</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.workaround_count || 0}</div><div class="stat-lbl">Workarounds</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${guestFacing}</div><div class="stat-lbl">Guest-Facing</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${stageNames.length}</div><div class="stat-lbl">Stages Covered</div></div>
  </div>
</div>

<div class="main">
  <div class="controls-bar">
    <input class="search-input" type="text" placeholder="Search systems, vendors, categories..." id="searchInput">
    <div class="filter-group">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="workarounds">Has Workarounds</button>
      <button class="filter-btn" data-filter="guest">Guest-Facing</button>
    </div>
  </div>

  ${journeyMapSection}

  <div id="categories">
  ${catSections}
  </div>
</div>

<script>
// Search
document.getElementById('searchInput').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll('.app-card[data-search]').forEach(card => {
    card.style.display = !q || card.dataset.search.includes(q) ? '' : 'none';
  });
  document.querySelectorAll('.cat-section').forEach(sec => {
    const visible = sec.querySelectorAll('.app-card[data-search]:not([style*="none"])').length;
    sec.style.display = !q || visible > 0 ? '' : 'none';
  });
});

// Filters
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const filter = this.dataset.filter;
    document.querySelectorAll('.app-card[data-search]').forEach(card => {
      if (filter === 'all') { card.style.display = ''; return; }
      if (filter === 'workarounds') { card.style.display = card.classList.contains('has-workaround') ? '' : 'none'; return; }
      if (filter === 'guest') { card.style.display = card.querySelector('.card-stages') ? '' : 'none'; return; }
    });
    document.querySelectorAll('.cat-section').forEach(sec => {
      const visible = sec.querySelectorAll('.app-card[data-search]:not([style*="none"])').length;
      sec.style.display = visible > 0 ? '' : 'none';
    });
  });
});
<\/script>
${DOWNLOAD_BAR_HTML}
</body></html>`;

  openReportWindow(html, 'Technology Landscape');
}
