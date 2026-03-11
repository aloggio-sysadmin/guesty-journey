import { apiCall } from '../api.js';
import { toast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { generateTechLandscape } from '../reports/tech-landscape.js';
import { generateJourneyDiagram } from '../reports/journey-diagram.js';
import { generateSwimlane } from '../reports/swimlane.js';
import { generateArtefactsGuide } from '../reports/artefacts-guide.js';
import { generateOperationalReport } from '../reports/operational-report.js';
import { generateJourneySpreadsheet } from '../reports/journey-spreadsheet.js';

const REPORTS = [
  {
    id: 'journey-map',
    title: 'Journey Map Report',
    description: 'Complete guest journey touchpoints, interactions, and pain points across all stages.',
    icon: '🗺️',
    color: 'blue'
  },
  {
    id: 'process-inventory',
    title: 'Process Inventory',
    description: 'All documented and as-practiced processes with discrepancy flags and maturity ratings.',
    icon: '⚙️',
    color: 'purple'
  },
  {
    id: 'tech-ecosystem',
    title: 'Technology Ecosystem',
    description: 'Systems, vendors, integrations, and manual workarounds across the organisation.',
    icon: '💻',
    color: 'green'
  },
  {
    id: 'gap-opportunity',
    title: 'Gap & Opportunity Register',
    description: 'All identified gaps, root causes, frequency, and guest impact scores.',
    icon: '🔍',
    color: 'amber'
  },
  {
    id: 'conflict-resolution',
    title: 'Conflict Resolution Log',
    description: 'SME conflicts, resolution status, and outcomes for cross-validation.',
    icon: '⚖️',
    color: 'red'
  },
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'AI-generated executive brief covering findings, risks, and strategic recommendations.',
    icon: '📊',
    color: 'indigo'
  }
];

const VISUAL_REPORTS = [
  {
    id: 'tech-landscape',
    title: 'Technology Landscape',
    description: 'Interactive technology map with categories, integrations, journey stage mapping, and search.',
    icon: '🏗️',
    color: 'teal',
    handler: generateTechLandscape
  },
  {
    id: 'journey-diagram',
    title: 'Journey Flow Diagram',
    description: 'Visual flowchart of the guest journey with phases, stage connections, and Mermaid.js rendering.',
    icon: '🔀',
    color: 'sky',
    handler: generateJourneyDiagram
  },
  {
    id: 'journey-swimlane',
    title: 'Journey Swimlane',
    description: 'Six-column swimlane view: stages, guest actions, processes, financial, touchpoints, and risks.',
    icon: '🏊',
    color: 'ocean',
    handler: generateSwimlane
  },
  {
    id: 'artefacts-guide',
    title: 'Supporting Artefacts',
    description: 'Prioritised guide of documentation and artefacts needed based on interview findings.',
    icon: '📋',
    color: 'orange',
    handler: generateArtefactsGuide
  },
  {
    id: 'operational-report',
    title: 'Operational Report',
    description: 'Comprehensive 8-section report: executive summary, gaps, processes, technology, risks, and more.',
    icon: '📑',
    color: 'navy',
    handler: generateOperationalReport
  },
  {
    id: 'journey-spreadsheet',
    title: 'Journey Map (Excel)',
    description: 'Multi-sheet XLSX download with journey map, processes, technology, gaps, conflicts, and SMEs.',
    icon: '📊',
    color: 'emerald',
    handler: generateJourneySpreadsheet
  }
];

function renderReportCard(r) {
  return `
    <div class="card" style="display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="font-size:28px">${r.icon}</div>
        <div>
          <div class="card-title" style="margin:0">${r.title}</div>
          <p style="font-size:12px;color:var(--text-secondary);margin:4px 0 0">${r.description}</p>
        </div>
      </div>
      <div style="margin-top:auto">
        <button class="btn btn-primary btn-sm" data-generate="${r.id}" style="width:100%">Generate</button>
      </div>
    </div>`;
}

export default function renderReports(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Reports</h2>
    </div>
    <div class="page-body">
      <h3 style="font-size:14px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Visual Reports</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Rich, interactive reports that open in a new tab. Styled for presentation and print.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:32px">
        ${VISUAL_REPORTS.map(renderReportCard).join('')}
      </div>

      <h3 style="font-size:14px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px">Data Reports</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Quick data summaries shown in a modal with print/export option.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${REPORTS.map(renderReportCard).join('')}
      </div>
    </div>`;

  // Remove prior listener to prevent duplicate tabs on re-render
  const handler = async (e) => {
    const btn = e.target.closest('[data-generate]');
    if (!btn) return;
    const reportId = btn.dataset.generate;
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      // Check if this is a visual report
      const visualReport = VISUAL_REPORTS.find(r => r.id === reportId);
      if (visualReport) {
        const data = await apiCall('POST', `/reports/${reportId}`);
        await visualReport.handler(data);
      } else {
        // Standard modal report
        const report = REPORTS.find(r => r.id === reportId);
        const data = await apiCall('POST', `/reports/${reportId}`);
        showReportModal(report, data);
      }
    } catch (err) {
      toast(err.message || 'Failed to generate report', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate';
    }
  };
  if (container._reportClickHandler) {
    container.removeEventListener('click', container._reportClickHandler);
  }
  container._reportClickHandler = handler;
  container.addEventListener('click', handler);
}

function showReportModal(report, data) {
  const content = formatReportContent(report.id, data);
  const modal = showModal({
    title: report.title,
    size: 'lg',
    body: `<div class="report-modal-body">${content}</div>`,
    actions: [
      { id: 'print', label: 'Print / Export', class: 'btn-ghost', handler: () => {
        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head>
          <title>${report.title}</title>
          <style>
            body { font-family: sans-serif; padding: 2rem; color: #1e293b; }
            h1 { border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; margin-bottom: 1rem; }
            h3 { margin: 1.5rem 0 0.5rem; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
            th { background: #f1f5f9; text-align: left; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; }
            td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; }
            .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; background: #e2e8f0; }
            ul { margin: 0.25rem 0 0.75rem 1.5rem; }
            .executive-summary { white-space: pre-wrap; line-height: 1.7; }
          </style></head><body>
          <h1>${report.title}</h1>
          <p style="color:#64748b">Generated: ${new Date().toLocaleString()}</p>
          ${document.querySelector('.report-modal-body').innerHTML}
          </body></html>`);
        win.document.close();
        win.print();
      }}
    ]
  });
}

function formatReportContent(reportId, data) {
  switch (reportId) {
    case 'journey-map':        return fmtJourneyMap(data);
    case 'process-inventory':  return fmtProcessInventory(data);
    case 'tech-ecosystem':     return fmtTechEcosystem(data);
    case 'gap-opportunity':    return fmtGapOpportunity(data);
    case 'conflict-resolution':return fmtConflictResolution(data);
    case 'executive-summary':  return fmtExecutiveSummary(data);
    default:                   return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}

function fmtJourneyMap(data) {
  const stages = data.stages || [];
  if (!stages.length) return '<p style="color:var(--text-secondary)">No journey data recorded yet.</p>';
  return stages.map(s => `
    <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <h3>${s.journey_stage}</h3>
      ${s.stage_description ? `<p>${s.stage_description}</p>` : ''}
      ${renderList('Frontstage Interactions', safeParse(s.frontstage_interactions_json))}
      ${renderList('Guest Actions',           safeParse(s.guest_actions_json))}
      ${renderList('Technology Touchpoints',  safeParse(s.technology_touchpoints_json))}
      ${renderList('Failure Points',          safeParse(s.failure_points_json))}
    </div>
  `).join('');
}

function fmtProcessInventory(data) {
  const rows = data.processes || [];
  if (!rows.length) return '<p style="color:var(--text-secondary)">No processes documented yet.</p>';
  return `<table>
    <thead><tr><th>Process</th><th>Stage</th><th>Maturity</th><th>Discrepancy</th></tr></thead>
    <tbody>${rows.map(p => `
      <tr>
        <td>${p.process_name}</td>
        <td>${p.journey_stage}</td>
        <td><span class="badge">${p.maturity || 'ad_hoc'}</span></td>
        <td>${p.discrepancy_flag ? 'Yes' : '—'}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

function fmtTechEcosystem(data) {
  const rows = data.systems || [];
  if (!rows.length) return '<p style="color:var(--text-secondary)">No systems documented yet.</p>';
  return `<table>
    <thead><tr><th>System</th><th>Vendor</th><th>Category</th><th>Environment</th></tr></thead>
    <tbody>${rows.map(s => `
      <tr>
        <td>${s.system_name}</td>
        <td>${s.vendor || '—'}</td>
        <td>${s.category || '—'}</td>
        <td>${s.environment || '—'}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

function fmtGapOpportunity(data) {
  const rows = data.gaps || [];
  if (!rows.length) return '<p style="color:var(--text-secondary)">No gaps identified yet.</p>';
  return `<table>
    <thead><tr><th>Title</th><th>Type</th><th>Stage</th><th>Guest Impact</th><th>Status</th></tr></thead>
    <tbody>${rows.map(g => `
      <tr>
        <td>${g.title}</td>
        <td>${g.gap_type || '—'}</td>
        <td>${g.journey_stage_id || '—'}</td>
        <td>${g.guest_impact || '—'}</td>
        <td><span class="badge">${g.status}</span></td>
      </tr>`).join('')}
    </tbody></table>`;
}

function fmtConflictResolution(data) {
  const rows = data.conflicts || [];
  if (!rows.length) return '<p style="color:var(--text-secondary)">No conflicts recorded yet.</p>';
  return `<table>
    <thead><tr><th>Description</th><th>Type</th><th>Status</th><th>Resolution</th></tr></thead>
    <tbody>${rows.map(c => `
      <tr>
        <td>${c.description}</td>
        <td>${c.type || '—'}</td>
        <td><span class="badge">${c.resolution_status || '—'}</span></td>
        <td>${c.resolution_notes || '—'}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

function fmtExecutiveSummary(data) {
  const summary = data.summary || data.reply || '';
  if (!summary) return '<p style="color:var(--text-secondary)">No summary available.</p>';
  return `<div class="executive-summary" style="white-space:pre-wrap;line-height:1.7">${summary.replace(/\n/g, '<br>')}</div>`;
}

function renderList(title, items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<div style="margin:8px 0"><strong>${title}</strong>
    <ul>${items.map(item =>
      `<li>${typeof item === 'string' ? item : (item.description || item.action || JSON.stringify(item))}</li>`
    ).join('')}</ul></div>`;
}

function safeParse(val) {
  if (!val) return [];
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return []; }
}
