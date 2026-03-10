import { FONTS_LINK, BASE_CSS, esc, openReportWindow } from './shared-styles.js';

const PRIORITY_BADGE = {
  critical: '<span class="badge badge-crit">Critical</span>',
  high: '<span class="badge badge-high">High</span>',
  medium: '<span class="badge badge-med">Medium</span>'
};

export function generateArtefactsGuide(data) {
  const sections = data.sections || [];
  const totalArtefacts = data.total_artefacts || 0;
  const pc = data.priority_counts || {};

  if (!totalArtefacts) {
    openReportWindow(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;text-align:center;color:#64748b"><h2>No artefacts identified yet.</h2><p>Complete more interviews to generate artefact recommendations.</p></body></html>`, 'Supporting Artefacts');
    return;
  }

  const sectionHtml = sections.map((sec, i) => {
    if (!sec.artefacts.length) return '';
    return `
    <div class="section-heading">
      <span class="s-num">Section ${i + 1}</span>
      <span class="s-title">${esc(sec.title)}</span>
      <span class="s-sub">${sec.artefacts.length} artefact${sec.artefacts.length === 1 ? '' : 's'}</span>
    </div>
    <div class="artefact-group">
      ${sec.artefacts.map(a => `
      <div class="artefact-row">
        <div class="col-artefact">
          <span class="artefact-name">${esc(a.name)}</span>
          <span class="artefact-type">${esc(a.type)}</span>
        </div>
        <div class="col-desc">
          <div class="desc-what">${esc(a.description)}</div>
          ${a.stage ? `<div class="desc-stage" style="font-size:11px;color:var(--mid-grey);margin-top:4px">Stage: ${esc(a.stage)}</div>` : ''}
        </div>
        <div class="col-priority" style="padding:18px;display:flex;align-items:center;justify-content:center">
          ${PRIORITY_BADGE[a.priority] || PRIORITY_BADGE.medium}
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
  border-left: 5px solid var(--mid); box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin-bottom: 32px;
}
.intro-card p { font-size: 14px; line-height: 1.7; color: var(--ink2); margin-bottom: 12px; }
.intro-card p:last-child { margin-bottom: 0; }
.intro-card strong { color: var(--navy); }
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
.section-heading {
  background: linear-gradient(90deg, var(--navy), #1A3A60); color: #fff;
  border-radius: 10px 10px 0 0; padding: 14px 22px;
  display: flex; align-items: center; gap: 14px;
}
.section-heading .s-num { background: var(--mid); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }
.section-heading .s-title { font-size: 15px; font-weight: 700; }
.section-heading .s-sub { font-size: 12px; color: rgba(255,255,255,0.55); margin-left: auto; }
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
  display: flex; flex-direction: column; justify-content: center; gap: 6px;
}
.desc-what { font-size: 12.5px; color: var(--ink); line-height: 1.55; }
.col-priority { border-right: none; }
@media (max-width: 768px) {
  .impact-bar { grid-template-columns: 1fr 1fr; }
  .artefact-row { grid-template-columns: 1fr; }
  .col-artefact, .col-desc, .col-priority { border-right: none; border-bottom: 1px solid var(--border); }
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

  <div class="impact-bar">
    <div class="impact-card"><div class="num">${totalArtefacts}</div><div class="lbl">Total Artefacts</div></div>
    <div class="impact-card c"><div class="num">${pc.critical || 0}</div><div class="lbl">Critical</div></div>
    <div class="impact-card h"><div class="num">${pc.high || 0}</div><div class="lbl">High Priority</div></div>
    <div class="impact-card m"><div class="num">${pc.medium || 0}</div><div class="lbl">Medium</div></div>
  </div>

  ${sectionHtml}
</div>

</body></html>`;

  openReportWindow(html, 'Supporting Artefacts Guide');
}
