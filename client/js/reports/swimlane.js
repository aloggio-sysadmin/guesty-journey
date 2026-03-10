import { FONTS_LINK, BASE_CSS, esc, openReportWindow, formatList } from './shared-styles.js';

export function generateSwimlane(data) {
  const stages = data.stages || [];
  if (!stages.length) {
    openReportWindow(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;text-align:center;color:#64748b"><h2>No journey stages mapped yet.</h2></body></html>`, 'Journey Swimlane');
    return;
  }

  const stageRows = stages.map((s, i) => {
    const hasHighRisk = s.gaps.some(g => g.guest_impact === 'high');
    const rowClass = hasHighRisk ? 'stage-row intersect' : 'stage-row';
    const smeNames = s.smes.map(m => m.name).join(', ') || '--';

    // Financial indicators from gaps with financial keywords
    const financialItems = s.gaps.filter(g =>
      ['trust', 'financial', 'payment', 'invoice', 'cost', 'expense', 'revenue', 'commission', 'accounting'].some(k =>
        ((g.title || '') + (g.gap_type || '')).toLowerCase().includes(k)
      )
    );

    return `
    <div class="stage-group">
      <div class="${rowClass}">
        <div class="col-stage">
          <div class="stage-id">${String(i + 1).padStart(2, '0')}</div>
          <div class="stage-name">${esc(s.journey_stage)}</div>
          <div class="stage-team">${esc(smeNames)}</div>
        </div>
        <div class="col-guest">${formatList(s.guest_actions)}</div>
        <div class="col-owner">
          ${s.frontstage_interactions.length ? '<div class="event-label">Frontstage</div>' : ''}
          ${formatList(s.frontstage_interactions)}
          ${s.backstage_processes.length ? '<div class="event-label" style="margin-top:8px">Backstage</div>' : ''}
          ${formatList(s.backstage_processes)}
        </div>
        <div class="col-fin">
          ${financialItems.length ? financialItems.map(f => `<div style="font-size:11px;padding:2px 0"><span class="badge badge-high">${esc(f.title)}</span></div>`).join('') : '<span style="color:var(--mid-grey);font-size:11px">--</span>'}
        </div>
        <div class="col-touch">${formatList(s.technology_touchpoints)}</div>
        <div class="col-risk">
          ${s.failure_points.length || s.gaps.filter(g => g.guest_impact === 'high').length ? `
            ${s.failure_points.map(fp => `<div style="font-size:11px;padding:2px 0" class="badge badge-crit">${esc(typeof fp === 'string' ? fp : fp.description || fp.name || JSON.stringify(fp))}</div>`).join('')}
            ${s.gaps.filter(g => g.guest_impact === 'high').map(g => `<div style="font-size:11px;padding:2px 0" class="badge badge-high">${esc(g.title)}</div>`).join('')}
          ` : '<span style="color:var(--mid-grey);font-size:11px">--</span>'}
        </div>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Guest Journey Swimlane</title>
${FONTS_LINK}
<style>
${BASE_CSS}
.summary-bar { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 32px; }
.summary-card {
  background: #fff; border-radius: 10px; padding: 16px 18px;
  border-left: 4px solid var(--mid); box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.summary-card .num { font-size: 28px; font-weight: 700; color: var(--navy); line-height: 1; margin-bottom: 4px; font-family: 'DM Mono', monospace; }
.summary-card .lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mid-grey); }
.summary-card.trust { border-color: var(--trust); }
.summary-card.risk { border-color: var(--crit); }
.summary-card.process { border-color: var(--expense); }
.summary-card.touch { border-color: var(--fee); }
.swimlane-wrapper { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
.lane-headers {
  display: grid; grid-template-columns: 180px 1fr 220px 160px 160px 160px;
  background: var(--navy); border-bottom: 2px solid var(--mid);
  position: sticky; top: 93px; z-index: 50;
}
.lane-header {
  padding: 14px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: rgba(255,255,255,0.85); border-right: 1px solid rgba(255,255,255,0.1);
}
.lane-header:last-child { border-right: none; }
.stage-group { border-bottom: 1px solid var(--border); }
.stage-group:last-child { border-bottom: none; }
.stage-row {
  display: grid; grid-template-columns: 180px 1fr 220px 160px 160px 160px;
  min-height: 90px; transition: background 0.15s;
}
.stage-row:hover { background: #F8FAFE; }
.stage-group:nth-child(even) .stage-row { background: #FAFBFD; }
.stage-row.intersect { border-left: 4px solid var(--intersect); }
.col-stage {
  padding: 14px; border-right: 1px solid var(--border);
  display: flex; flex-direction: column; justify-content: center; gap: 4px;
  background: linear-gradient(180deg, var(--navy) 0%, #274b7a 100%);
}
.col-stage .stage-id { font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.45); letter-spacing: 0.1em; }
.col-stage .stage-name { font-size: 12px; font-weight: 700; color: #fff; line-height: 1.3; }
.col-stage .stage-team { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; line-height: 1.3; }
.col-guest, .col-owner, .col-fin, .col-touch, .col-risk {
  padding: 14px 16px; border-right: 1px solid var(--border);
  font-size: 12px; line-height: 1.55; color: var(--ink2);
  display: flex; flex-direction: column; justify-content: center; gap: 4px;
}
.col-risk { border-right: none; }
.event-label { font-size: 11.5px; font-weight: 600; color: var(--ink); line-height: 1.4; }
@media (max-width: 1024px) {
  .summary-bar { grid-template-columns: repeat(3, 1fr); }
  .lane-headers, .stage-row { grid-template-columns: 140px 1fr 180px 140px 140px 140px; }
}
@media (max-width: 768px) {
  .summary-bar { grid-template-columns: 1fr 1fr; }
  .swimlane-wrapper { overflow-x: auto; }
  .lane-headers, .stage-row { min-width: 960px; }
}
</style>
</head><body>

<div class="page-header">
  <div class="header-inner">
    <div class="header-title">
      <h1>Guest Journey Mapping</h1>
      <h2>Guest Journey <span>Swimlane</span></h2>
    </div>
    <div class="header-meta">
      Generated: ${new Date().toLocaleString()}<br>Live data from system
    </div>
  </div>
</div>

<div class="main">
  <div class="summary-bar">
    <div class="summary-card"><div class="num">${data.stage_count || 0}</div><div class="lbl">Journey Stages</div></div>
    <div class="summary-card touch"><div class="num">${data.total_touchpoints || 0}</div><div class="lbl">Touchpoints</div></div>
    <div class="summary-card process"><div class="num">${data.total_processes || 0}</div><div class="lbl">Processes</div></div>
    <div class="summary-card risk"><div class="num">${data.total_risks || 0}</div><div class="lbl">Risk Items</div></div>
    <div class="summary-card trust"><div class="num">${stages.reduce((n, s) => n + s.gaps.length, 0)}</div><div class="lbl">Gaps</div></div>
  </div>

  <div class="swimlane-wrapper">
    <div class="lane-headers">
      <div class="lane-header">Stage</div>
      <div class="lane-header" style="color:#A8D4F5">Guest Actions</div>
      <div class="lane-header" style="color:#A8E6C4">Owner / Process</div>
      <div class="lane-header" style="color:var(--trust)">Financial</div>
      <div class="lane-header" style="color:#F0E68C">Touchpoints</div>
      <div class="lane-header" style="color:#FFB3B3">Risk</div>
    </div>
    ${stageRows}
  </div>
</div>

</body></html>`;

  openReportWindow(html, 'Guest Journey Swimlane');
}
