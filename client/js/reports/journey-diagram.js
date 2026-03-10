import { FONTS_LINK, BASE_CSS, esc, openReportWindow } from './shared-styles.js';

const PHASE_LABELS = {
  discovery: { label: 'Discovery', color: '#2E75B6', emoji: '🔍' },
  booking: { label: 'Booking', color: '#2E75B6', emoji: '📋' },
  pre_arrival: { label: 'Pre-Arrival', color: '#5A8A5E', emoji: '✉️' },
  arrival: { label: 'Arrival', color: '#F4A460', emoji: '🏨' },
  in_stay: { label: 'In-Stay', color: '#9B59B6', emoji: '🛎️' },
  departure: { label: 'Departure', color: '#E67E22', emoji: '🧳' },
  post_stay: { label: 'Post-Stay', color: '#C0392B', emoji: '⭐' },
  other: { label: 'Other', color: '#8E9BAE', emoji: '📌' }
};

export function generateJourneyDiagram(data) {
  const stages = data.stages || [];
  if (!stages.length) {
    openReportWindow(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;text-align:center;color:#64748b"><h2>No journey stages mapped yet.</h2></body></html>`, 'Journey Diagram');
    return;
  }

  // Build Mermaid flowchart definition — default TD (top-down)
  const phaseGroups = {};
  for (const s of stages) {
    if (!phaseGroups[s.phase]) phaseGroups[s.phase] = [];
    phaseGroups[s.phase].push(s);
  }

  function buildMermaidDef(direction) {
    let def = `%%{ init: { "theme": "base", "themeVariables": { "fontSize": "14px", "primaryColor": "#2E75B6", "primaryTextColor": "#fff", "primaryBorderColor": "#fff", "lineColor": "#4A5568", "secondaryColor": "#5A8A5E", "tertiaryColor": "#F4A460" } } }%%\nflowchart ${direction}\n`;
    const phaseOrder = ['discovery', 'booking', 'pre_arrival', 'arrival', 'in_stay', 'departure', 'post_stay', 'other'];

    for (const phase of phaseOrder) {
      const group = phaseGroups[phase];
      if (!group || !group.length) continue;
      const pl = PHASE_LABELS[phase] || PHASE_LABELS.other;
      def += `  subgraph ${phase}["${pl.emoji} ${pl.label}"]\n`;
      for (const s of group) {
        const id = s.stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
        const desc = s.stage_description ? s.stage_description.substring(0, 40) : '';
        const label = s.journey_stage + (s.failure_points_count > 0 ? ' ⚠' : '') +
          (desc ? '\\n' + desc + (s.stage_description.length > 40 ? '...' : '') : '') +
          '\\n' + s.guest_actions_count + ' actions · ' + s.touchpoints_count + ' touchpoints';
        def += `    ${id}["${label}"]\n`;
      }
      def += '  end\n';
    }

    // Add connections between consecutive stages
    for (let i = 0; i < stages.length - 1; i++) {
      const fromId = stages[i].stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
      const toId = stages[i + 1].stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
      def += `  ${fromId} --> ${toId}\n`;
    }

    // Build classDef styles for each phase
    for (const phase of phaseOrder) {
      const group = phaseGroups[phase];
      if (!group) continue;
      const pl = PHASE_LABELS[phase] || PHASE_LABELS.other;
      for (const s of group) {
        const id = s.stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
        def += `  style ${id} fill:${pl.color},stroke:#fff,color:#fff,stroke-width:2px\n`;
      }
    }
    return def;
  }

  const legendItems = Object.entries(phaseGroups).map(([phase]) => {
    const pl = PHASE_LABELS[phase] || PHASE_LABELS.other;
    return `<span class="legend-item">
      <span class="legend-dot" style="background:${pl.color}"></span>${pl.emoji} ${pl.label}
    </span>`;
  }).join('');

  const stageDetails = stages.map(s => `
    <div class="detail-card" style="border-left:4px solid ${(PHASE_LABELS[s.phase] || PHASE_LABELS.other).color}">
      <div class="detail-name">${esc(s.journey_stage)}</div>
      ${s.stage_description ? `<div class="detail-desc">${esc(s.stage_description)}</div>` : ''}
      <div class="detail-stats">
        <span>${s.guest_actions_count} actions</span>
        <span>${s.touchpoints_count} touchpoints</span>
        ${s.failure_points_count > 0 ? `<span class="detail-risk">${s.failure_points_count} failure points</span>` : ''}
      </div>
    </div>
  `).join('');

  // Initial Mermaid def (will be overridden by JS)
  const initialDef = buildMermaidDef('TD');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Journey Flow Diagram</title>
${FONTS_LINK}
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"><\/script>
<style>
${BASE_CSS}
/* Legend bar */
.legend-bar {
  background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: 10px 48px; display: flex; gap: 20px; flex-wrap: wrap; align-items: center;
}
.legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.75); }
.legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
/* Toolbar */
.diagram-toolbar {
  display: flex; align-items: center; gap: 12px; padding: 10px 18px;
  background: linear-gradient(180deg, #2C3E50, #1A2332); border-radius: 14px 14px 0 0;
  border: 1px solid rgba(255,255,255,0.1); border-bottom: none;
}
.tb-dots { display: flex; gap: 6px; }
.tb-dot { width: 12px; height: 12px; border-radius: 50%; }
.tb-dot.red { background: #FF5F57; }
.tb-dot.yellow { background: #FFBD2E; }
.tb-dot.green { background: #28C840; }
.tb-filename { font-size: 12px; color: rgba(255,255,255,0.5); font-family: 'DM Mono', monospace; margin-left: 12px; flex: 1; }
.tb-controls { display: flex; align-items: center; gap: 6px; }
.tb-btn {
  padding: 5px 10px; font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 600;
  border: 1px solid rgba(255,255,255,0.18); border-radius: 5px;
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); cursor: pointer; transition: all 0.15s;
}
.tb-btn:hover { background: rgba(46,117,182,0.35); border-color: var(--mid); color: #fff; }
.tb-btn.active { background: var(--mid); border-color: var(--mid); color: #fff; }
.zoom-level { font-size: 11px; color: rgba(255,255,255,0.5); font-family: 'DM Mono', monospace; min-width: 38px; text-align: center; }
.tb-sep { width: 1px; height: 20px; background: rgba(255,255,255,0.15); margin: 0 4px; }
/* Diagram container */
.diagram-container {
  background: #fff; border: 1px solid rgba(255,255,255,0.1); border-top: none;
  border-radius: 0 0 14px 14px; padding: 0; margin-bottom: 32px;
  overflow: hidden; position: relative;
  background-image: radial-gradient(circle at 1px 1px, #DDE3EC 1px, transparent 0);
  background-size: 24px 24px;
}
.diagram-scroll {
  overflow: auto; cursor: grab; min-height: 400px; max-height: 75vh; padding: 32px;
}
.diagram-scroll:active { cursor: grabbing; }
.diagram-scroll .mermaid { text-align: center; transform-origin: center top; transition: transform 0.1s ease-out; }
/* Direction toggles */
.dir-group { display: flex; gap: 2px; }
/* Stage details */
.detail-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;
}
.detail-card {
  background: #fff; border-radius: 10px; padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.detail-name { font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
.detail-desc { font-size: 11.5px; color: var(--ink2); margin-bottom: 6px; line-height: 1.5; }
.detail-stats { font-size: 11px; color: var(--mid-grey); display: flex; gap: 16px; }
.detail-risk { color: var(--crit); }
@media print {
  .diagram-toolbar { display: none; }
  .diagram-container { border: 1px solid var(--border); border-radius: 8px; }
}
</style>
</head><body>

<div class="page-header">
  <div class="header-inner">
    <div class="header-title">
      <h1>Guest Journey Mapping</h1>
      <h2>Journey Flow <span>Diagram</span></h2>
    </div>
    <div class="header-meta">
      Generated: ${new Date().toLocaleString()}<br>Live data from system
    </div>
  </div>
</div>

<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat-item"><div class="stat-num">${data.stage_count || 0}</div><div class="stat-lbl">Stages</div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-num">${data.phase_count || 0}</div><div class="stat-lbl">Phases</div></div>
  </div>
</div>

<div class="legend-bar">${legendItems}</div>

<div class="main">
  <div class="diagram-toolbar">
    <div class="tb-dots"><div class="tb-dot red"></div><div class="tb-dot yellow"></div><div class="tb-dot green"></div></div>
    <div class="tb-filename">journey-flow.mermaid</div>
    <div class="tb-controls">
      <div class="dir-group">
        <button class="tb-btn active" id="btnTD" title="Top-Down">TD</button>
        <button class="tb-btn" id="btnLR" title="Left-Right">LR</button>
      </div>
      <div class="tb-sep"></div>
      <button class="tb-btn" id="zoomOut" title="Zoom Out (-)">−</button>
      <span class="zoom-level" id="zoomLevel">100%</span>
      <button class="tb-btn" id="zoomIn" title="Zoom In (+)">+</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" id="zoomReset" title="Reset (0)">Reset</button>
      <button class="tb-btn" id="zoomFit" title="Fit to view">Fit</button>
    </div>
  </div>

  <div class="diagram-container">
    <div class="diagram-scroll" id="diagramScroll">
      <div class="mermaid" id="mermaidDiagram">${initialDef}</div>
    </div>
  </div>

  <h3 style="color:#fff;font-size:16px;margin-bottom:16px">Stage Details</h3>
  <div class="detail-grid">${stageDetails}</div>
</div>

<script>
(function() {
  mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { fontSize: '14px' } });

  // Mermaid definitions for each direction
  const defs = {
    TD: ${JSON.stringify(buildMermaidDef('TD'))},
    LR: ${JSON.stringify(buildMermaidDef('LR'))}
  };

  let currentDir = 'TD';
  let zoom = 1;
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.15;

  const scrollEl = document.getElementById('diagramScroll');
  const mermaidEl = document.getElementById('mermaidDiagram');
  const zoomLevelEl = document.getElementById('zoomLevel');

  function updateZoom() {
    mermaidEl.style.transform = 'scale(' + zoom + ')';
    zoomLevelEl.textContent = Math.round(zoom * 100) + '%';
  }

  async function renderDiagram(dir) {
    currentDir = dir;
    document.getElementById('btnTD').classList.toggle('active', dir === 'TD');
    document.getElementById('btnLR').classList.toggle('active', dir === 'LR');
    try {
      const { svg } = await mermaid.render('mermaid-' + Date.now(), defs[dir]);
      mermaidEl.innerHTML = svg;
      updateZoom();
    } catch(e) { console.error('Mermaid render error:', e); }
  }

  // Direction toggles
  document.getElementById('btnTD').addEventListener('click', function() { renderDiagram('TD'); });
  document.getElementById('btnLR').addEventListener('click', function() { renderDiagram('LR'); });

  // Zoom controls
  document.getElementById('zoomIn').addEventListener('click', function() {
    zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    updateZoom();
  });
  document.getElementById('zoomOut').addEventListener('click', function() {
    zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    updateZoom();
  });
  document.getElementById('zoomReset').addEventListener('click', function() {
    zoom = 1; updateZoom();
  });
  document.getElementById('zoomFit').addEventListener('click', function() {
    const svg = mermaidEl.querySelector('svg');
    if (!svg) return;
    const svgW = svg.getBoundingClientRect().width / zoom;
    const containerW = scrollEl.clientWidth - 64;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, containerW / svgW));
    updateZoom();
  });

  // Keyboard zoom
  document.addEventListener('keydown', function(e) {
    if (e.key === '+' || e.key === '=') { zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP); updateZoom(); e.preventDefault(); }
    if (e.key === '-') { zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP); updateZoom(); e.preventDefault(); }
    if (e.key === '0') { zoom = 1; updateZoom(); e.preventDefault(); }
  });

  // Scroll-wheel zoom (Ctrl + wheel)
  scrollEl.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoom = e.deltaY < 0
        ? Math.min(MAX_ZOOM, zoom + ZOOM_STEP)
        : Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
      updateZoom();
    }
  }, { passive: false });

  // Drag to pan
  let isDragging = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
  scrollEl.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.pageX - scrollEl.offsetLeft;
    startY = e.pageY - scrollEl.offsetTop;
    scrollLeft = scrollEl.scrollLeft;
    scrollTop = scrollEl.scrollTop;
  });
  scrollEl.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollEl.offsetLeft;
    const y = e.pageY - scrollEl.offsetTop;
    scrollEl.scrollLeft = scrollLeft - (x - startX);
    scrollEl.scrollTop = scrollTop - (y - startY);
  });
  scrollEl.addEventListener('mouseup', function() { isDragging = false; });
  scrollEl.addEventListener('mouseleave', function() { isDragging = false; });
})();
<\/script>
</body></html>`;

  openReportWindow(html, 'Journey Flow Diagram');
}
