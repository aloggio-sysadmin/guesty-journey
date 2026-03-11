/** Shared design tokens and CSS snippets for visual reports */

export const FONTS_LINK = `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">`;

export const BASE_CSS = `
:root {
  --navy: #1F3864; --mid: #2E75B6; --light: #D6E4F0;
  --trust: #F4A460; --trust-l: #FCE4D6;
  --expense: #5A8A5E; --expense-l: #E2EFDA;
  --fee: #9B59B6; --fee-l: #EAD1DC;
  --crit: #C0392B; --crit-l: #FDECEA;
  --high: #E67E22; --high-l: #FFF3E0;
  --med: #27AE60; --med-l: #DFFBEA;
  --intersect: #F39C12; --intersect-l: #FFF2CC;
  --grey: #F5F6F8; --border: #DDE3EC;
  --mid-grey: #8E9BAE; --white: #FFFFFF;
  --ink: #1A2332; --ink2: #4A5568;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: #0E1621; color: var(--ink); min-height: 100vh; }
.page-header {
  background: linear-gradient(135deg, var(--navy) 0%, #0E2340 60%, #162B4A 100%);
  padding: 36px 48px 28px; border-bottom: 3px solid var(--mid);
  position: sticky; top: 0; z-index: 200;
}
.header-inner { max-width: 1600px; margin: 0 auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.header-title h1 { font-size: 12px; font-weight: 600; letter-spacing: 0.18em; color: var(--mid); text-transform: uppercase; margin-bottom: 6px; }
.header-title h2 { font-size: 24px; font-weight: 700; color: #fff; }
.header-title h2 span { color: #FFF2CC; }
.header-meta { text-align: right; font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.7; }
.main { max-width: 1600px; margin: 0 auto; padding: 32px 24px 80px; }
.stats-bar { background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 10px 48px; }
.stats-inner { max-width: 1600px; margin: 0 auto; display: flex; gap: 28px; flex-wrap: wrap; align-items: center; }
.stat-item { text-align: center; }
.stat-num { font-size: 22px; font-weight: 700; font-family: 'DM Mono', monospace; color: #fff; line-height: 1; }
.stat-lbl { font-size: 9.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-top: 2px; }
.stat-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.1); }
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.03em; }
.badge-crit { background: var(--crit-l); color: var(--crit); }
.badge-high { background: var(--high-l); color: var(--high); }
.badge-med  { background: var(--med-l); color: var(--med); }
.badge-mid  { background: var(--light); color: var(--mid); }
/* Download bar */
.download-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;
  background: linear-gradient(180deg, rgba(14,22,33,0.95), rgba(14,22,33,0.99));
  backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.1);
  padding: 12px 48px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;
}
.dl-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  letter-spacing: 0.03em; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); cursor: pointer;
  transition: all 0.15s;
}
.dl-btn:hover { background: var(--mid); border-color: var(--mid); color: #fff; }
.dl-btn svg { width: 14px; height: 14px; }
@media print {
  body { background: #fff; }
  .page-header { position: static; background: var(--navy); }
  .stats-bar { background: #f5f5f5; }
  .no-print, .download-bar { display: none !important; }
}
`;

/** CSS for the operational report (white background, no download bar dark theme) */
export const REPORT_DOWNLOAD_CSS = `
.download-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.99));
  backdrop-filter: blur(8px); border-top: 1px solid var(--border);
  padding: 12px 48px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;
}
.dl-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  letter-spacing: 0.03em; border: 1px solid var(--border); border-radius: 6px;
  background: #fff; color: var(--navy); cursor: pointer; transition: all 0.15s;
}
.dl-btn:hover { background: var(--mid); border-color: var(--mid); color: #fff; }
.dl-btn svg { width: 14px; height: 14px; }
@media print {
  .download-bar { display: none !important; }
}
`;

const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

export const DOWNLOAD_BAR_HTML = `
<div class="download-bar no-print">
  <button class="dl-btn" onclick="window.print()" title="Save as PDF via Print dialog">
    ${DOWNLOAD_ICON} Download PDF
  </button>
</div>`;

export function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function openReportWindow(html, title) {
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to view reports.'); return; }
  win.document.write(html);
  win.document.close();
  win.document.title = title;
}

export function formatList(items) {
  if (!Array.isArray(items) || !items.length) return '<span style="color:var(--mid-grey)">--</span>';
  return items.map(item => {
    const text = typeof item === 'string' ? item : (item.description || item.action || item.name || item.system || JSON.stringify(item));
    return `<div style="font-size:11.5px;line-height:1.5;padding:2px 0">${esc(text)}</div>`;
  }).join('');
}
