import { FONTS_LINK, BASE_CSS, DOWNLOAD_BAR_HTML, esc, openReportWindow, formatList } from './shared-styles.js';

const PHASE_MAP = {
  discovery: ['discovery', 'pre_booking', 'pre-booking', 'search', 'research'],
  booking: ['booking', 'reservation', 'enquiry', 'inquiry'],
  stay: ['arrival', 'check_in', 'check-in', 'in_stay', 'in-stay', 'during', 'departure', 'check_out', 'check-out'],
  post_stay: ['post_stay', 'post-stay', 'follow_up', 'review', 'feedback'],
  performance: ['performance', 'reporting', 'analytics', 'management']
};

const PHASE_LABELS = {
  discovery: { label: 'DISCOVERY PHASE', color: '#2E75B6' },
  booking: { label: 'BOOKING PHASE', color: '#2E75B6' },
  stay: { label: 'STAY EXPERIENCE', color: '#5A8A5E' },
  post_stay: { label: 'POST-STAY PHASE', color: '#E67E22' },
  performance: { label: 'PERFORMANCE & MANAGEMENT', color: '#9B59B6' }
};

function getPhase(stageId) {
  const id = (stageId || '').toLowerCase().replace(/\s+/g, '_');
  for (const [phase, keywords] of Object.entries(PHASE_MAP)) {
    if (keywords.some(k => id.includes(k))) return phase;
  }
  return 'stay';
}

function deriveFinancialType(stage) {
  const allText = [
    ...(stage.gaps || []).map(g => (g.title || '') + (g.gap_type || '')),
    ...(stage.processes || []).map(p => p.process_name || '')
  ].join(' ').toLowerCase();

  if (['trust', 'accounting', 'reconciliation', 'ledger', 'trust account'].some(k => allText.includes(k))) return { type: 'Trust Event', cls: 'fin-trust' };
  if (['expense', 'cost', 'procurement', 'supplier', 'payroll'].some(k => allText.includes(k))) return { type: 'Business Expense', cls: 'fin-expense' };
  if (['fee', 'commission', 'surcharge', 'charge'].some(k => allText.includes(k))) return { type: 'Fee/Commission', cls: 'fin-fee' };
  if (['payment', 'invoice', 'billing', 'revenue', 'price'].some(k => allText.includes(k))) return { type: 'Financial Event', cls: 'fin-trust' };
  return { type: 'None', cls: 'fin-none' };
}

function deriveTouchpointType(stage) {
  const hasTech = (stage.technology_touchpoints || []).length > 0;
  const hasManual = (stage.backstage_processes || []).length > 0 || (stage.frontstage_interactions || []).length > 0;
  if (hasTech && hasManual) return { type: 'Hybrid', cls: 'tp-hybrid' };
  if (hasTech) return { type: 'Automated', cls: 'tp-auto' };
  return { type: 'Human', cls: 'tp-human' };
}

export function generateSwimlane(data) {
  const stages = data.stages || [];
  if (!stages.length) {
    openReportWindow(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;text-align:center;color:#64748b"><h2>No journey stages mapped yet.</h2></body></html>`, 'Journey Swimlane');
    return;
  }

  // Group stages by phase
  const phaseGroups = {};
  for (const s of stages) {
    const phase = getPhase(s.stage_id || s.journey_stage);
    if (!phaseGroups[phase]) phaseGroups[phase] = [];
    phaseGroups[phase].push(s);
  }

  const phaseOrder = ['discovery', 'booking', 'stay', 'post_stay', 'performance'];
  let stageIndex = 0;
  let stageRowsHtml = '';

  for (const phase of phaseOrder) {
    const group = phaseGroups[phase];
    if (!group || !group.length) continue;
    const pl = PHASE_LABELS[phase] || PHASE_LABELS.stay;

    // Phase divider
    stageRowsHtml += `
    <div class="phase-divider" style="background: linear-gradient(90deg, #0E2340, #1A3A60);">
      <span class="phase-label" style="color:${pl.color}">${pl.label}</span>
    </div>`;

    for (const s of group) {
      stageIndex++;
      const hasHighRisk = s.gaps.some(g => g.guest_impact === 'high');
      const rowClass = hasHighRisk ? 'stage-row intersect' : 'stage-row';
      const smeNames = s.smes.map(m => m.name).join(', ') || '--';
      const financial = deriveFinancialType(s);
      const tpType = deriveTouchpointType(s);
      const hasDocSop = (s.processes || []).some(p => p.has_documentation);

      // Financial items from gaps
      const financialItems = s.gaps.filter(g =>
        ['trust', 'financial', 'payment', 'invoice', 'cost', 'expense', 'revenue', 'commission', 'accounting', 'fee'].some(k =>
          ((g.title || '') + (g.gap_type || '')).toLowerCase().includes(k)
        )
      );

      stageRowsHtml += `
    <div class="stage-group">
      <div class="${rowClass}">
        <div class="col-stage">
          <div class="stage-id">${String(stageIndex).padStart(2, '0')}</div>
          <div class="stage-name">${esc(s.journey_stage)}</div>
          <div class="stage-team">${esc(smeNames)}</div>
        </div>
        <div class="col-guest">
          ${s.stage_description ? `<div class="event-detail">${esc(s.stage_description)}</div>` : ''}
          ${s.guest_actions.length ? '<div class="event-label">Guest Actions</div>' : ''}
          ${formatList(s.guest_actions)}
        </div>
        <div class="col-owner">
          ${s.frontstage_interactions.length ? '<div class="event-label">Frontstage</div>' : ''}
          ${formatList(s.frontstage_interactions)}
          ${s.backstage_processes.length ? '<div class="event-label" style="margin-top:8px">Backstage</div>' : ''}
          ${formatList(s.backstage_processes)}
          ${smeNames !== '--' ? `<div class="event-label" style="margin-top:8px">Responsible</div><div style="font-size:11px;color:var(--ink2)">${esc(smeNames)}</div>` : ''}
        </div>
        <div class="col-fin">
          <span class="fin-badge ${financial.cls}">${financial.type}</span>
          ${financialItems.length ? financialItems.map(f => `<div style="font-size:11px;padding:2px 0"><span class="badge badge-high">${esc(f.title)}</span></div>`).join('') : ''}
        </div>
        <div class="col-touch">
          <span class="tp-badge ${tpType.cls}">${tpType.type}</span>
          ${hasDocSop ? '<span class="sop-badge sop-yes">SOP</span>' : '<span class="sop-badge sop-no">No SOP</span>'}
          ${formatList(s.technology_touchpoints)}
        </div>
        <div class="col-risk">
          ${s.failure_points.length || s.gaps.filter(g => g.guest_impact === 'high').length ? `
            ${s.failure_points.map(fp => `<div style="font-size:11px;padding:2px 0" class="badge badge-crit">${esc(typeof fp === 'string' ? fp : fp.description || fp.name || JSON.stringify(fp))}</div>`).join('')}
            ${s.gaps.filter(g => g.guest_impact === 'high').map(g => `<div style="font-size:11px;padding:2px 0" class="badge badge-high">${esc(g.title)}</div>`).join('')}
          ` : '<span style="color:var(--mid-grey);font-size:11px">--</span>'}
        </div>
      </div>
      ${hasHighRisk ? `
      <div class="intersection-banner">
        <span class="ib-icon">⚡</span>
        <span class="ib-text">Cross-functional intersection — ${s.gaps.filter(g => g.guest_impact === 'high').length} high-impact gap${s.gaps.filter(g => g.guest_impact === 'high').length !== 1 ? 's' : ''} affecting this stage</span>
      </div>` : ''}
    </div>`;
    }
  }

  // Support function section — derive from SME data
  const allSmes = stages.flatMap(s => s.smes || []);
  const uniqueSmes = {};
  for (const sme of allSmes) {
    if (!uniqueSmes[sme.name]) uniqueSmes[sme.name] = sme;
  }
  const supportSmes = Object.values(uniqueSmes);

  const supportSection = supportSmes.length ? `
  <div class="support-section">
    <div class="support-header">
      <span class="support-title">Support Function Map</span>
      <span class="support-count">${supportSmes.length} support roles</span>
    </div>
    <div class="support-body">
      ${supportSmes.map(sme => `
      <div class="support-row">
        <div class="support-name">${esc(sme.name)}</div>
        <div class="support-dept">${esc(sme.department || '--')}</div>
        <div class="support-role">${esc(sme.role || '--')}</div>
      </div>`).join('')}
    </div>
  </div>` : '';

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
/* Phase dividers */
.phase-divider {
  padding: 10px 18px; display: flex; align-items: center;
  border-bottom: 2px solid rgba(255,255,255,0.1);
}
.phase-label {
  font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
}
/* Lane headers */
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
.event-detail { font-size: 11px; color: var(--mid-grey); line-height: 1.5; margin-bottom: 6px; font-style: italic; }
/* Financial badges */
.fin-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; margin-bottom: 6px; }
.fin-trust { background: var(--trust-l); color: #8B5E3C; }
.fin-expense { background: var(--expense-l); color: #2A5A2E; }
.fin-fee { background: var(--fee-l); color: #5B2880; }
.fin-none { background: var(--grey); color: var(--mid-grey); }
/* Touchpoint type badges */
.tp-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; margin-bottom: 4px; }
.tp-auto { background: #D6E4F0; color: #2E75B6; }
.tp-human { background: #FCE4D6; color: #C0562A; }
.tp-hybrid { background: #EAD1DC; color: #5B2880; }
/* SOP badges */
.sop-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-bottom: 6px; margin-left: 4px; }
.sop-yes { background: #DFFBEA; color: var(--med); }
.sop-no { background: #FFF3E0; color: var(--high); }
/* Intersection banner */
.intersection-banner {
  background: linear-gradient(90deg, #FFF2CC, #FFF9E6); padding: 8px 18px;
  display: flex; align-items: center; gap: 8px; border-top: 1px solid #F0D060;
}
.ib-icon { font-size: 14px; }
.ib-text { font-size: 11.5px; font-weight: 600; color: #7A5000; }
/* Support section */
.support-section { margin-top: 32px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
.support-header {
  background: linear-gradient(135deg, #4A1060, #6B1B9A); padding: 16px 20px;
  display: flex; align-items: center; justify-content: space-between;
}
.support-title { font-size: 14px; font-weight: 700; color: #fff; }
.support-count { font-size: 12px; color: rgba(255,255,255,0.5); font-family: 'DM Mono', monospace; }
.support-body { padding: 4px 0; }
.support-row {
  display: grid; grid-template-columns: 200px 180px 1fr; padding: 10px 20px;
  border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--ink2);
}
.support-row:last-child { border-bottom: none; }
.support-name { font-weight: 600; color: var(--navy); }
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
      <div class="lane-header" style="color:#A8D4F5">Guest Journey</div>
      <div class="lane-header" style="color:#A8E6C4">Owner Impact</div>
      <div class="lane-header" style="color:var(--trust)">Financial</div>
      <div class="lane-header" style="color:#F0E68C">Touchpoints</div>
      <div class="lane-header" style="color:#FFB3B3">Risk</div>
    </div>
    ${stageRowsHtml}
  </div>

  ${supportSection}
</div>

${DOWNLOAD_BAR_HTML}
</body></html>`;

  openReportWindow(html, 'Guest Journey Swimlane');
}
