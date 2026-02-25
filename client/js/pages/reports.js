'use strict';
import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

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

export default function renderReports(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Reports</h1>
      <p class="text-muted">Generate and export journey mapping reports</p>
    </div>
    <div class="reports-grid">
      ${REPORTS.map(r => `
        <div class="report-card report-card--${r.color}" data-report-id="${r.id}">
          <div class="report-card__icon">${r.icon}</div>
          <div class="report-card__body">
            <h3>${r.title}</h3>
            <p>${r.description}</p>
          </div>
          <div class="report-card__actions">
            <button class="btn btn--primary btn--sm" data-generate="${r.id}">Generate</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-generate]');
    if (!btn) return;
    const reportId = btn.dataset.generate;
    const report = REPORTS.find(r => r.id === reportId);
    btn.disabled = true;
    btn.textContent = 'Generating…';
    try {
      const data = await api.post(`/reports/${reportId}`);
      showReportModal(report, data);
    } catch (err) {
      showToast(err.message || 'Failed to generate report', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate';
    }
  });
}

function showReportModal(report, data) {
  const content = formatReportContent(report.id, data);
  openModal({
    title: report.title,
    size: 'large',
    content: `<div class="report-modal-body">${content}</div>`,
    actions: `
      <button class="btn btn--secondary" id="print-report-btn">Print / Export</button>
      <button class="btn btn--primary" id="close-report-btn">Close</button>
    `
  });

  document.getElementById('close-report-btn').addEventListener('click', () => closeModal());
  document.getElementById('print-report-btn').addEventListener('click', () => {
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
        .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px;
                 font-size: 0.75rem; background: #e2e8f0; }
        ul { margin: 0.25rem 0 0.75rem 1.5rem; }
        .report-section { margin-bottom: 1.5rem; padding-bottom: 1.5rem;
                          border-bottom: 1px solid #e2e8f0; }
        .executive-summary { white-space: pre-wrap; line-height: 1.7; }
      </style></head><body>
      <h1>${report.title}</h1>
      <p style="color:#64748b">Generated: ${new Date().toLocaleString()}</p>
      ${document.querySelector('.report-modal-body').innerHTML}
      </body></html>`);
    win.document.close();
    win.print();
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
  if (!stages.length) return '<p class="text-muted">No journey data recorded yet.</p>';
  return stages.map(s => `
    <div class="report-section">
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
  if (!rows.length) return '<p class="text-muted">No processes documented yet.</p>';
  return `<table>
    <thead><tr><th>Process</th><th>Stage</th><th>Maturity</th><th>Discrepancy</th></tr></thead>
    <tbody>${rows.map(p => `
      <tr>
        <td>${p.process_name}</td>
        <td>${p.journey_stage}</td>
        <td><span class="badge">${p.maturity || 'ad_hoc'}</span></td>
        <td>${p.discrepancy_flag ? '⚠️ Yes' : '—'}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

function fmtTechEcosystem(data) {
  const rows = data.systems || [];
  if (!rows.length) return '<p class="text-muted">No systems documented yet.</p>';
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
  if (!rows.length) return '<p class="text-muted">No gaps identified yet.</p>';
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
  if (!rows.length) return '<p class="text-muted">No conflicts recorded yet.</p>';
  return `<table>
    <thead><tr><th>Description</th><th>Type</th><th>Stage</th><th>Status</th><th>Resolution</th></tr></thead>
    <tbody>${rows.map(c => `
      <tr>
        <td>${c.description}</td>
        <td>${c.conflict_type || '—'}</td>
        <td>${c.journey_stage || '—'}</td>
        <td><span class="badge">${c.status}</span></td>
        <td>${c.resolution_notes || '—'}</td>
      </tr>`).join('')}
    </tbody></table>`;
}

function fmtExecutiveSummary(data) {
  const summary = data.summary || data.reply || '';
  if (!summary) return '<p class="text-muted">No summary available.</p>';
  return `<div class="executive-summary">${summary.replace(/\n/g, '<br>')}</div>`;
}

function renderList(title, items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<div class="report-list"><strong>${title}</strong>
    <ul>${items.map(item =>
      `<li>${typeof item === 'string' ? item : (item.description || item.action || JSON.stringify(item))}</li>`
    ).join('')}</ul></div>`;
}

function safeParse(val) {
  if (!val) return [];
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return []; }
}
