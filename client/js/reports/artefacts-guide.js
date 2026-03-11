import { FONTS_LINK, BASE_CSS, DOWNLOAD_BAR_HTML, esc, openReportWindow } from './shared-styles.js';

const PRIORITY_BADGE = {
  critical: '<span class="badge badge-crit">Critical</span>',
  high: '<span class="badge badge-high">High</span>',
  medium: '<span class="badge badge-med">Medium</span>'
};

function getAnonNote(type) {
  const t = (type || '').toLowerCase();
  if (['financial', 'trust', 'accounting', 'payment'].some(k => t.includes(k))) return 'Anonymise financial data';
  if (['conflict', 'resolution'].some(k => t.includes(k))) return 'Anonymise names';
  if (['experience', 'feedback', 'guest'].some(k => t.includes(k))) return 'No sensitive data';
  return 'No sensitive data';
}

export function generateArtefactsGuide(data) {
  const sections = data.sections || [];
  const totalArtefacts = data.total_artefacts || 0;
  const pc = data.priority_counts || {};

  if (!totalArtefacts) {
    openReportWindow(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;text-align:center;color:#64748b"><h2>No artefacts identified yet.</h2><p>Complete more interviews to generate artefact recommendations.</p></body></html>`, 'Supporting Artefacts');
    return;
  }

  // Find top critical artefacts for "Most Valuable Combination" callout
  const allArtefacts = sections.flatMap(s => s.artefacts);
  const criticalArtefacts = allArtefacts.filter(a => a.priority === 'critical');
  const topCritical = criticalArtefacts.slice(0, 2);

  // Quick wins: top 6 critical/high artefacts
  const quickWins = allArtefacts
    .filter(a => a.priority === 'critical' || a.priority === 'high')
    .slice(0, 6);

  const sectionHtml = sections.map((sec, i) => {
    if (!sec.artefacts.length) return '';
    return `
    <div class="section-heading">
      <span class="s-num">Section ${i + 1}</span>
      <span class="s-title">${esc(sec.title)}</span>
      <span class="s-sub">${sec.artefacts.length} artefact${sec.artefacts.length === 1 ? '' : 's'}</span>
    </div>
    <div class="artefact-group">
      <div class="col-sub-headers">
        <div>Document / Artefact</div>
        <div>What it is & why it matters</div>
        <div>Priority</div>
      </div>
      ${sec.artefacts.map(a => `
      <div class="artefact-row">
        <div class="col-artefact">
          <span class="artefact-name">${esc(a.name)}</span>
          <span class="artefact-type">${esc(a.type)}</span>
        </div>
        <div class="col-desc">
          <div class="desc-what">${esc(a.description)}</div>
          ${a.stage ? `
          <div class="why-callout">
            <div class="why-title">Why it matters</div>
            <div class="why-text">Stage: ${esc(a.stage)} — ${a.priority === 'critical' ? 'Requires immediate attention for operational continuity' : a.priority === 'high' ? 'Essential for completeness and accuracy of engagement' : 'Recommended to improve overall quality'}</div>
          </div>` : ''}
        </div>
        <div class="col-priority">
          ${PRIORITY_BADGE[a.priority] || PRIORITY_BADGE.medium}
          <div class="anon-note">${getAnonNote(a.type)}</div>
        </div>
      </div>`).join('')}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Supporting Artefacts Guide</title>
${FONTS_LINK}
<style>
${BASE_CSS}
.intro-card {
  background: #fff; border-radius: 14px; padding: 28px 32px;
  border-left: 5px solid var(--mid); box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 20px;
}
.intro-card p { font-size: 14px; line-height: 1.7; color: var(--ink2); margin-bottom: 12px; }
.intro-card p:last-child { margin-bottom: 0; }
.intro-card strong { color: var(--navy); }
/* Blue info callout */
.callout-info {
  background: #EBF5FF; border: 1px solid #B3D4FC; border-left: 4px solid #2E75B6;
  border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;
}
.callout-info .ci-title { font-size: 13px; font-weight: 700; color: #1A5276; margin-bottom: 6px; }
.callout-info .ci-text { font-size: 12.5px; color: #1A5276; line-height: 1.6; }
/* Red warning callout */
.callout-warn {
  background: #FFF5F5; border: 1px solid #FEB2B2; border-left: 4px solid var(--crit);
  border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;
}
.callout-warn .cw-title { font-size: 13px; font-weight: 700; color: #7B0000; margin-bottom: 6px; }
.callout-warn .cw-text { font-size: 12.5px; color: #7B0000; line-height: 1.6; }
.impact-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
.impact-card {
  background: #fff; border-radius: 10px; padding: 16px 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 4px solid var(--mid);
}
.impact-card.c { border-top-color: var(--crit); }
.impact-card.h { border-top-color: var(--high); }
.impact-card.m { border-top-color: var(--med); }
.impact-card .num { font-size: 30px; font-weight: 700; font-family: 'DM Mono', monospace; color: var(--navy); line-height: 1; margin-bottom: 4px; }
.impact-card .lbl { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--mid-grey); }
/* Section heading */
.section-heading {
  background: linear-gradient(90deg, var(--navy), #1A3A60); color: #fff;
  border-radius: 10px 10px 0 0; padding: 14px 22px;
  display: flex; align-items: center; gap: 14px;
}
.section-heading .s-num { background: var(--mid); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
.section-heading .s-title { font-size: 15px; font-weight: 700; }
.section-heading .s-sub { font-size: 12px; color: rgba(255,255,255,0.55); margin-left: auto; }
/* Column sub-headers */
.col-sub-headers {
  display: grid; grid-template-columns: 260px 1fr 140px;
  background: #F5F6F8; border-bottom: 2px solid var(--border); padding: 10px 0;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mid-grey);
}
.col-sub-headers > div { padding: 0 18px; }
.artefact-group {
  background: #fff; border-radius: 0 0 14px 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 28px; overflow: hidden;
}
.artefact-row {
  display: grid; grid-template-columns: 260px 1fr 140px;
  min-height: 80px; border-bottom: 1px solid var(--border); transition: background 0.12s;
}
.artefact-row:last-child { border-bottom: none; }
.artefact-row:hover { background: #F8FAFE; }
.col-artefact {
  padding: 18px; border-right: 1px solid var(--border);
  display: flex; flex-direction: column; justify-content: center; gap: 6px;
}
.artefact-name { font-size: 13px; font-weight: 700; color: var(--navy); line-height: 1.3; }
.artefact-type { font-size: 10.5px; font-family: 'DM Mono', monospace; color: var(--mid-grey); }
.col-desc {
  padding: 18px 20px; border-right: 1px solid var(--border);
  display: flex; flex-direction: column; justify-content: center; gap: 8px;
}
.desc-what { font-size: 12.5px; color: var(--ink); line-height: 1.55; }
/* Why it matters callout inside description */
.why-callout {
  background: #F8FAFE; border: 1px solid #D6E4F0; border-radius: 6px; padding: 8px 12px;
}
.why-title { font-size: 10.5px; font-weight: 700; color: var(--mid); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
.why-text { font-size: 11.5px; color: var(--ink2); line-height: 1.5; }
.col-priority {
  padding: 18px; border-right: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
}
.anon-note { font-size: 10px; color: var(--mid-grey); text-align: center; line-height: 1.4; }
/* Quick Wins box */
.quick-wins {
  background: #fff; border-radius: 14px; padding: 24px 28px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-top: 4px solid var(--med);
}
.qw-title { font-size: 16px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
.qw-subtitle { font-size: 12px; color: var(--mid-grey); margin-bottom: 16px; }
.qw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.qw-card {
  border: 1px solid var(--border); border-radius: 8px; padding: 14px;
  border-left: 3px solid var(--high); transition: background 0.12s;
}
.qw-card:hover { background: #F8FAFE; }
.qw-card.crit { border-left-color: var(--crit); }
.qw-card-name { font-size: 12.5px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
.qw-card-type { font-size: 10.5px; color: var(--mid-grey); font-family: 'DM Mono', monospace; }
@media (max-width: 768px) {
  .impact-bar { grid-template-columns: 1fr 1fr; }
  .artefact-row, .col-sub-headers { grid-template-columns: 1fr; }
  .col-artefact, .col-desc, .col-priority { border-right: none; border-bottom: 1px solid var(--border); }
  .qw-grid { grid-template-columns: 1fr; }
}
</style>
</head><body>

<div class="page-header">
  <div class="header-inner">
    <div class="header-title">
      <h1>Guest Journey Mapping</h1>
      <h2>Supporting <span>Artefacts Guide</span></h2>
    </div>
    <div class="header-meta">
      Generated: ${new Date().toLocaleString()}<br>
      Live data from system
    </div>
  </div>
</div>

<div class="main">
  <div class="intro-card">
    <p>This guide identifies <strong>${totalArtefacts} supporting artefacts</strong> derived from interview data. Each artefact represents documentation, analysis, or resolution work needed to complete the journey mapping engagement.</p>
    <p>Artefacts are prioritised as <strong>Critical</strong> (immediate attention), <strong>High</strong> (required for completeness), or <strong>Medium</strong> (recommended improvement).</p>
  </div>

  ${topCritical.length >= 2 ? `
  <div class="callout-info">
    <div class="ci-title">Most Valuable Combination</div>
    <div class="ci-text">Resolving <strong>${esc(topCritical[0].name)}</strong> alongside <strong>${esc(topCritical[1].name)}</strong> will deliver the highest combined impact on operational quality and guest experience.</div>
  </div>` : ''}

  <div class="impact-bar">
    <div class="impact-card"><div class="num">${totalArtefacts}</div><div class="lbl">Total Artefacts</div></div>
    <div class="impact-card c"><div class="num">${pc.critical || 0}</div><div class="lbl">Critical</div></div>
    <div class="impact-card h"><div class="num">${pc.high || 0}</div><div class="lbl">High Priority</div></div>
    <div class="impact-card m"><div class="num">${pc.medium || 0}</div><div class="lbl">Medium</div></div>
  </div>

  ${sectionHtml}

  <div class="callout-warn">
    <div class="cw-title">Important: Data Sensitivity</div>
    <div class="cw-text">All supporting artefacts should be anonymised or sanitised before sharing externally. Proprietary financial data, staff names, and guest information must be redacted or replaced with representative examples.</div>
  </div>

  ${quickWins.length ? `
  <div class="quick-wins">
    <div class="qw-title">Quick Wins</div>
    <div class="qw-subtitle">Top priority artefacts that can be addressed immediately for maximum impact</div>
    <div class="qw-grid">
      ${quickWins.map(a => `
      <div class="qw-card${a.priority === 'critical' ? ' crit' : ''}">
        <div class="qw-card-name">${esc(a.name)}</div>
        <div class="qw-card-type">${esc(a.type)} ${PRIORITY_BADGE[a.priority] || ''}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>

${DOWNLOAD_BAR_HTML}
</body></html>`;

  openReportWindow(html, 'Supporting Artefacts Guide');
}
