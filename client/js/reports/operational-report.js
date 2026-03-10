import { FONTS_LINK, esc, openReportWindow } from './shared-styles.js';

export function generateOperationalReport(data) {
  const stats = data.stats || {};
  const exec = data.executive || {};
  const journey = data.journey || {};
  const processes = data.processes || {};
  const tech = data.technology || {};
  const gaps = data.gaps || {};
  const conflicts = data.conflicts || {};
  const smes = data.smes || [];

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Operational Report</title>
${FONTS_LINK}
<style>
:root {
  --navy: #1F3864; --mid: #2E75B6; --light: #D6E4F0;
  --trust: #F4A460; --expense: #5A8A5E; --crit: #C0392B;
  --high: #E67E22; --med: #27AE60;
  --border: #DDE3EC; --ink: #1A2332; --ink2: #4A5568; --mid-grey: #8E9BAE;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; background: #fff; color: var(--ink); max-width: 1100px; margin: 0 auto; padding: 0; }
.report-header {
  background: linear-gradient(135deg, var(--navy) 0%, #0E2340 100%);
  padding: 48px; color: #fff;
}
.report-header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.report-header .subtitle { font-size: 14px; color: rgba(255,255,255,0.6); }
.report-header .meta { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 12px; }
.report-body { padding: 40px 48px; }
.section { margin-bottom: 40px; page-break-inside: avoid; }
.section-title {
  font-size: 18px; font-weight: 700; color: var(--navy);
  border-bottom: 3px solid var(--mid); padding-bottom: 8px; margin-bottom: 16px;
}
.section-num { font-size: 12px; font-weight: 600; color: var(--mid); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
.narrative { font-size: 14px; line-height: 1.8; color: var(--ink2); white-space: pre-wrap; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12.5px; }
th { background: var(--navy); color: #fff; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
td { border: 1px solid var(--border); padding: 10px 12px; color: var(--ink2); vertical-align: top; }
tr:nth-child(even) td { background: #FAFBFD; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
.b-crit { background: #FDECEA; color: var(--crit); }
.b-high { background: #FFF3E0; color: var(--high); }
.b-med  { background: #DFFBEA; color: var(--med); }
.b-mid  { background: var(--light); color: var(--mid); }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card {
  border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center;
  border-top: 3px solid var(--mid);
}
.stat-card .num { font-size: 28px; font-weight: 700; color: var(--navy); font-family: 'DM Mono', monospace; }
.stat-card .lbl { font-size: 10px; font-weight: 600; color: var(--mid-grey); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
.toc { margin: 20px 0 32px; }
.toc a { display: block; padding: 6px 0; font-size: 14px; color: var(--mid); text-decoration: none; border-bottom: 1px dotted var(--border); }
.toc a:hover { color: var(--navy); }
@media print {
  .report-header { padding: 32px; }
  .report-body { padding: 24px 32px; }
  .section { page-break-inside: avoid; }
  .no-print { display: none !important; }
}
</style>
</head><body>

<div class="report-header">
  <h1>Operational Report</h1>
  <div class="subtitle">Guest Journey Mapping Engagement</div>
  <div class="meta">Generated: ${new Date().toLocaleString()} | Live data from system</div>
</div>

<div class="report-body">

  <div class="toc no-print">
    <strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:var(--mid-grey)">Contents</strong>
    <a href="#s1">1. Executive Summary</a>
    <a href="#s2">2. Journey Overview</a>
    <a href="#s3">3. Process Inventory</a>
    <a href="#s4">4. Technology Ecosystem</a>
    <a href="#s5">5. Operational Gap Analysis</a>
    <a href="#s6">6. Automation vs Humanisation</a>
    <a href="#s7">7. Risk & Conflict Register</a>
    <a href="#s8">8. Support Function Map</a>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><div class="num">${stats.sme_count || 0}</div><div class="lbl">SMEs Interviewed</div></div>
    <div class="stat-card"><div class="num">${stats.stage_count || 0}</div><div class="lbl">Stages Mapped</div></div>
    <div class="stat-card"><div class="num">${stats.process_count || 0}</div><div class="lbl">Processes</div></div>
    <div class="stat-card"><div class="num">${stats.system_count || 0}</div><div class="lbl">Systems</div></div>
  </div>

  <!-- Section 1: Executive Summary -->
  <div class="section" id="s1">
    <div class="section-num">Section 1</div>
    <div class="section-title">Executive Summary</div>
    <div class="narrative">${esc(exec.summary || 'Executive summary not yet generated.')}</div>
  </div>

  <!-- Section 2: Journey Overview -->
  <div class="section" id="s2">
    <div class="section-num">Section 2</div>
    <div class="section-title">Journey Overview</div>
    <table>
      <thead><tr><th>Stage</th><th>Description</th><th>Guest Actions</th><th>Touchpoints</th><th>Failure Points</th></tr></thead>
      <tbody>${(journey.stages || []).map(s => `
        <tr>
          <td><strong>${esc(s.journey_stage)}</strong></td>
          <td>${esc(s.stage_description)}</td>
          <td>${(s.guest_actions_json || []).length}</td>
          <td>${(s.technology_touchpoints_json || []).length}</td>
          <td>${(s.failure_points_json || []).length ? `<span class="badge b-crit">${(s.failure_points_json || []).length}</span>` : '--'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Section 3: Process Inventory -->
  <div class="section" id="s3">
    <div class="section-num">Section 3</div>
    <div class="section-title">Process Inventory</div>
    <p style="font-size:13px;color:var(--ink2);margin-bottom:12px">${processes.process_count || 0} processes documented. ${processes.discrepancy_count || 0} discrepancies found. ${processes.conflict_count || 0} conflicts flagged.</p>
    <table>
      <thead><tr><th>Process</th><th>Stage</th><th>Maturity</th><th>Discrepancy</th><th>Owner</th></tr></thead>
      <tbody>${(processes.processes || []).map(p => `
        <tr>
          <td><strong>${esc(p.process_name)}</strong></td>
          <td>${esc(p.journey_stage)}</td>
          <td><span class="badge b-mid">${esc(p.maturity)}</span></td>
          <td>${p.discrepancy_flag ? '<span class="badge b-high">Yes</span>' : '--'}</td>
          <td>${esc(p.owner_sme_name)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Section 4: Technology Ecosystem -->
  <div class="section" id="s4">
    <div class="section-num">Section 4</div>
    <div class="section-title">Technology Ecosystem</div>
    <p style="font-size:13px;color:var(--ink2);margin-bottom:12px">${tech.system_count || 0} systems across ${Object.keys(tech.category_breakdown || {}).length} categories. ${tech.systems_with_manual_workarounds || 0} with manual workarounds.</p>
    <table>
      <thead><tr><th>System</th><th>Vendor</th><th>Category</th><th>Environment</th><th>Integrations</th><th>Workarounds</th></tr></thead>
      <tbody>${(tech.systems || []).map(s => `
        <tr>
          <td><strong>${esc(s.system_name)}</strong></td>
          <td>${esc(s.vendor)}</td>
          <td>${esc(s.category)}</td>
          <td>${esc(s.environment)}</td>
          <td>${s.integration_links.length || '--'}</td>
          <td>${s.manual_workarounds.length ? `<span class="badge b-high">${s.manual_workarounds.length}</span>` : '--'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- Section 5: Operational Gap Analysis -->
  <div class="section" id="s5">
    <div class="section-num">Section 5</div>
    <div class="section-title">Operational Gap Analysis</div>
    <p style="font-size:13px;color:var(--ink2);margin-bottom:12px">${gaps.gap_count || 0} gaps identified. High impact: ${(gaps.impact_breakdown || {}).high || 0}. Open: ${(gaps.status_breakdown || {}).open || 0}.</p>
    <table>
      <thead><tr><th>Gap</th><th>Type</th><th>Stage</th><th>Guest Impact</th><th>Root Cause</th><th>Status</th></tr></thead>
      <tbody>${(gaps.gaps || []).map(g => {
        const impactClass = g.guest_impact === 'high' ? 'b-crit' : (g.guest_impact === 'medium' ? 'b-high' : 'b-med');
        return `<tr>
          <td><strong>${esc(g.title)}</strong><div style="font-size:11px;color:var(--mid-grey)">${esc(g.description).slice(0, 120)}</div></td>
          <td>${esc(g.gap_type)}</td>
          <td>${esc(g.journey_stage)}</td>
          <td><span class="badge ${impactClass}">${esc(g.guest_impact)}</span></td>
          <td style="font-size:11px">${esc(g.root_cause)}</td>
          <td><span class="badge b-mid">${esc(g.status)}</span></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>

  <!-- Section 6: Automation vs Humanisation -->
  <div class="section" id="s6">
    <div class="section-num">Section 6</div>
    <div class="section-title">Automation vs Humanisation</div>
    <p style="font-size:13px;color:var(--ink2);margin-bottom:12px">Analysis of process maturity levels and automation potential.</p>
    <table>
      <thead><tr><th>Maturity Level</th><th>Count</th><th>Percentage</th></tr></thead>
      <tbody>${Object.entries(processes.maturity_breakdown || {}).map(([level, count]) => `
        <tr>
          <td><strong>${esc(level)}</strong></td>
          <td>${count}</td>
          <td>${processes.process_count ? Math.round((count / processes.process_count) * 100) : 0}%</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${(processes.processes || []).filter(p => p.discrepancy_flag).length ? `
    <h4 style="font-size:14px;color:var(--navy);margin:20px 0 8px">Discrepancy Analysis</h4>
    <table>
      <thead><tr><th>Process</th><th>Stage</th><th>Documented</th><th>As Practiced</th></tr></thead>
      <tbody>${(processes.processes || []).filter(p => p.discrepancy_flag).map(p => `
        <tr>
          <td><strong>${esc(p.process_name)}</strong></td>
          <td>${esc(p.journey_stage)}</td>
          <td style="font-size:11px">${esc(p.as_documented) || '<em>Not documented</em>'}</td>
          <td style="font-size:11px">${esc(p.as_practiced) || '--'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}
  </div>

  <!-- Section 7: Risk & Conflict Register -->
  <div class="section" id="s7">
    <div class="section-num">Section 7</div>
    <div class="section-title">Risk & Conflict Register</div>
    <p style="font-size:13px;color:var(--ink2);margin-bottom:12px">${conflicts.conflict_count || 0} conflicts. Open: ${conflicts.open_count || 0}. Resolved: ${conflicts.resolved_count || 0}.</p>
    ${(conflicts.conflicts || []).length ? `
    <table>
      <thead><tr><th>Conflict</th><th>Type</th><th>Stage</th><th>SMEs Involved</th><th>Status</th><th>Resolution</th></tr></thead>
      <tbody>${(conflicts.conflicts || []).map(c => `
        <tr>
          <td>${esc(c.description)}</td>
          <td>${esc(c.conflict_type)}</td>
          <td>${esc(c.journey_stage)}</td>
          <td>${esc(c.sme_a_name)}${c.sme_b_name ? ' vs ' + esc(c.sme_b_name) : ''}</td>
          <td><span class="badge ${c.status === 'resolved' ? 'b-med' : 'b-high'}">${esc(c.status)}</span></td>
          <td style="font-size:11px">${esc(c.resolution_notes)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:var(--mid-grey)">No conflicts recorded.</p>'}
  </div>

  <!-- Section 8: Support Function Map -->
  <div class="section" id="s8">
    <div class="section-num">Section 8</div>
    <div class="section-title">Support Function Map</div>
    <p style="font-size:13px;color:var(--ink2);margin-bottom:12px">${smes.length} SMEs across the organisation supporting the guest journey.</p>
    <table>
      <thead><tr><th>Name</th><th>Department</th><th>Role</th><th>Interview Status</th><th>Stages Covered</th></tr></thead>
      <tbody>${smes.map(s => `
        <tr>
          <td><strong>${esc(s.full_name)}</strong></td>
          <td>${esc(s.department)}</td>
          <td>${esc(s.role)}</td>
          <td><span class="badge ${s.interview_status === 'completed' ? 'b-med' : 'b-mid'}">${esc(s.interview_status)}</span></td>
          <td style="font-size:11px">${(s.stages || []).join(', ') || '--'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

</div>

</body></html>`;

  openReportWindow(html, 'Operational Report');
}
