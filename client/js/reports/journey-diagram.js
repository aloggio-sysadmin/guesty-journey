import { FONTS_LINK, BASE_CSS, esc, openReportWindow } from './shared-styles.js';

const PHASE_LABELS = {
  discovery: { label: 'Discovery', color: '#2E75B6' },
  booking: { label: 'Booking', color: '#2E75B6' },
  pre_arrival: { label: 'Pre-Arrival', color: '#5A8A5E' },
  arrival: { label: 'Arrival', color: '#F4A460' },
  in_stay: { label: 'In-Stay', color: '#9B59B6' },
  departure: { label: 'Departure', color: '#E67E22' },
  post_stay: { label: 'Post-Stay', color: '#C0392B' },
  other: { label: 'Other', color: '#8E9BAE' }
};

export function generateJourneyDiagram(data) {
  const stages = data.stages || [];
  if (!stages.length) {
    openReportWindow(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;text-align:center;color:#64748b"><h2>No journey stages mapped yet.</h2></body></html>`, 'Journey Diagram');
    return;
  }

  // Build Mermaid flowchart definition
  const phaseGroups = {};
  for (const s of stages) {
    if (!phaseGroups[s.phase]) phaseGroups[s.phase] = [];
    phaseGroups[s.phase].push(s);
  }

  let mermaidDef = 'flowchart LR\n';
  const phaseOrder = ['discovery', 'booking', 'pre_arrival', 'arrival', 'in_stay', 'departure', 'post_stay', 'other'];

  for (const phase of phaseOrder) {
    const group = phaseGroups[phase];
    if (!group || !group.length) continue;
    const pl = PHASE_LABELS[phase] || PHASE_LABELS.other;
    mermaidDef += `  subgraph ${phase}["${pl.label}"]\n`;
    for (const s of group) {
      const id = s.stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
      const label = s.journey_stage + (s.failure_points_count > 0 ? ' ⚠' : '');
      mermaidDef += `    ${id}["${label}"]\n`;
    }
    mermaidDef += '  end\n';
  }

  // Add connections between consecutive stages
  for (let i = 0; i < stages.length - 1; i++) {
    const fromId = stages[i].stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
    const toId = stages[i + 1].stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
    mermaidDef += `  ${fromId} --> ${toId}\n`;
  }

  // Build style classes
  for (const phase of phaseOrder) {
    const group = phaseGroups[phase];
    if (!group) continue;
    const pl = PHASE_LABELS[phase] || PHASE_LABELS.other;
    for (const s of group) {
      const id = s.stage_id.replace(/[^a-zA-Z0-9_]/g, '_');
      mermaidDef += `  style ${id} fill:${pl.color},stroke:#fff,color:#fff,stroke-width:2px\n`;
    }
  }

  const legendItems = Object.entries(phaseGroups).map(([phase]) => {
    const pl = PHASE_LABELS[phase] || PHASE_LABELS.other;
    return `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,0.75)">
      <span style="width:12px;height:12px;border-radius:3px;background:${pl.color};flex-shrink:0"></span>${pl.label}
    </span>`;
  }).join('');

  const stageDetails = stages.map(s => `
    <div style="background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid ${(PHASE_LABELS[s.phase] || PHASE_LABELS.other).color}">
      <div style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px">${esc(s.journey_stage)}</div>
      <div style="font-size:11px;color:var(--mid-grey);display:flex;gap:16px">
        <span>${s.guest_actions_count} actions</span>
        <span>${s.touchpoints_count} touchpoints</span>
        ${s.failure_points_count > 0 ? `<span style="color:var(--crit)">${s.failure_points_count} failure points</span>` : ''}
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Journey Flow Diagram</title>
${FONTS_LINK}
<script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"><\/script>
<style>
${BASE_CSS}
.diagram-container {
  background: #fff; border-radius: 14px; padding: 32px; margin-bottom: 32px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12); overflow-x: auto;
}
.diagram-container .mermaid { text-align: center; }
.ctrl-btn {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.8); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.ctrl-btn:hover { background: rgba(46,117,182,0.35); border-color: var(--mid); color: #fff; }
.ctrl-btn.active { background: var(--mid); border-color: var(--mid); color: #fff; }
.stage-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;
}
</style>
</head><body>

<div class="page-header">
  <div class="header-inner">
    <div class="header-title">
      <h1>Guest Journey Mapping</h1>
      <h2>Journey Flow <span>Diagram</span></h2>
    </div>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="display:flex;gap:8px;flex-wrap:wrap">${legendItems}</div>
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

<div class="main">
  <div class="diagram-container">
    <div class="mermaid">${mermaidDef}</div>
  </div>

  <h3 style="color:#fff;font-size:16px;margin-bottom:16px">Stage Details</h3>
  <div class="stage-grid">${stageDetails}</div>
</div>

<script>mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { fontSize: '14px' } });<\/script>
</body></html>`;

  openReportWindow(html, 'Journey Flow Diagram');
}
