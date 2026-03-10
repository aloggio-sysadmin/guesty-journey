/**
 * Generates a multi-sheet XLSX workbook and triggers download.
 * Uses SheetJS (xlsx.js) loaded from CDN.
 */

let XLSX = null;

async function loadSheetJS() {
  if (XLSX) return XLSX;
  if (window.XLSX) { XLSX = window.XLSX; return XLSX; }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    script.onload = () => { XLSX = window.XLSX; resolve(XLSX); };
    script.onerror = () => reject(new Error('Failed to load SheetJS library'));
    document.head.appendChild(script);
  });
}

function flattenList(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map(item => {
    if (typeof item === 'string') return item;
    return item.description || item.action || item.name || item.system || JSON.stringify(item);
  }).join('\n');
}

function deriveFinancialType(stage) {
  const allText = flattenList(stage.guest_actions_json || []) + ' ' +
    flattenList(stage.frontstage_interactions_json || []) + ' ' +
    flattenList(stage.backstage_processes_json || []);
  const lower = allText.toLowerCase();
  if (['trust', 'accounting', 'reconciliation', 'ledger'].some(k => lower.includes(k))) return 'Trust Event';
  if (['expense', 'cost', 'procurement', 'supplier', 'payroll'].some(k => lower.includes(k))) return 'Business Expense';
  if (['fee', 'commission', 'surcharge'].some(k => lower.includes(k))) return 'Fee/Commission';
  if (['payment', 'invoice', 'billing', 'revenue', 'price'].some(k => lower.includes(k))) return 'Financial Event';
  return 'None';
}

export async function generateJourneySpreadsheet(data) {
  const xlsx = await loadSheetJS();

  const wb = xlsx.utils.book_new();

  // ── Sheet 1: Journey Map (expanded columns) ──
  const jmStages = (data.journey && data.journey.stages) || [];
  const jmData = [[
    'Stage', 'Description', 'Guest Actions', 'Frontstage Interactions', 'Backstage Processes',
    'Technology Touchpoints', 'Failure Points', 'Supporting SMEs',
    'Financial Event Type', 'Responsible Team', 'Touchpoint Type', 'SOP Exists',
    'Systems Involved', 'Failure/Compliance Risks'
  ]];
  for (const s of jmStages) {
    const techTps = s.technology_touchpoints_json || [];
    const hasTech = techTps.length > 0;
    const hasManual = (s.backstage_processes_json || []).length > 0;
    const tpType = hasTech && hasManual ? 'Hybrid' : hasTech ? 'Automated' : 'Human';

    jmData.push([
      s.journey_stage,
      s.stage_description || '',
      flattenList(s.guest_actions_json),
      flattenList(s.frontstage_interactions_json),
      flattenList(s.backstage_processes_json),
      flattenList(s.technology_touchpoints_json),
      flattenList(s.failure_points_json),
      (s.supporting_smes || []).join(', '),
      deriveFinancialType(s),
      (s.supporting_smes || []).join(', ') || '--',
      tpType,
      '--',  // SOP status derived at swimlane level, simplified here
      flattenList(techTps),
      flattenList(s.failure_points_json)
    ]);
  }
  const jmSheet = xlsx.utils.aoa_to_sheet(jmData);
  jmSheet['!cols'] = [
    { wch: 20 }, { wch: 40 }, { wch: 35 }, { wch: 35 }, { wch: 35 },
    { wch: 35 }, { wch: 35 }, { wch: 30 },
    { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
    { wch: 35 }, { wch: 35 }
  ];
  xlsx.utils.book_append_sheet(wb, jmSheet, 'Journey Map');

  // ── Sheet 2: Process Inventory ──
  const procs = (data.processes && data.processes.processes) || [];
  const piData = [['Process', 'Stage', 'Sub-Stage', 'Maturity', 'Discrepancy', 'Discrepancy Notes', 'As Documented', 'As Practiced', 'Owner', 'Conflict']];
  for (const p of procs) {
    piData.push([
      p.process_name, p.journey_stage, p.sub_stage || '',
      p.maturity, p.discrepancy_flag ? 'Yes' : 'No', p.discrepancy_notes || '',
      p.as_documented || '', p.as_practiced || '',
      p.owner_sme_name || '', p.conflict_flag ? 'Yes' : 'No'
    ]);
  }
  const piSheet = xlsx.utils.aoa_to_sheet(piData);
  piSheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 35 }, { wch: 35 }, { wch: 20 }, { wch: 10 }];
  xlsx.utils.book_append_sheet(wb, piSheet, 'Process Inventory');

  // ── Sheet 3: Technology Register ──
  const systems = (data.technology && data.technology.systems) || [];
  const teData = [['System', 'Vendor', 'Category', 'Environment', 'Integrations', 'Manual Workarounds', 'Users']];
  for (const s of systems) {
    teData.push([
      s.system_name, s.vendor || '', s.category || '', s.environment || '',
      flattenList(s.integration_links),
      flattenList(s.manual_workarounds),
      flattenList(s.users)
    ]);
  }
  const teSheet = xlsx.utils.aoa_to_sheet(teData);
  teSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 35 }, { wch: 35 }, { wch: 25 }];
  xlsx.utils.book_append_sheet(wb, teSheet, 'Technology Register');

  // ── Sheet 4: Gap Analysis ──
  const gapList = (data.gaps && data.gaps.gaps) || [];
  const gaData = [['Title', 'Description', 'Type', 'Stage', 'Root Cause', 'Frequency', 'Guest Impact', 'Business Impact', 'Financial Impact', 'Status', 'Confirmed by Multiple SMEs']];
  for (const g of gapList) {
    gaData.push([
      g.title, g.description || '', g.gap_type || '', g.journey_stage || '',
      g.root_cause || '', g.frequency || '',
      g.guest_impact || '', g.business_impact || '', g.financial_impact_estimate || '',
      g.status || '', g.confirmed_by_multiple_smes ? 'Yes' : 'No'
    ]);
  }
  const gaSheet = xlsx.utils.aoa_to_sheet(gaData);
  gaSheet['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
  xlsx.utils.book_append_sheet(wb, gaSheet, 'Gap Analysis');

  // ── Sheet 5: Conflict Log ──
  const conflictList = (data.conflicts && data.conflicts.conflicts) || [];
  const clData = [['Description', 'Type', 'Stage', 'SME A', 'SME B', 'Status', 'Resolution Method', 'Resolution Notes']];
  for (const c of conflictList) {
    clData.push([
      c.description || '', c.conflict_type || '', c.journey_stage || '',
      c.sme_a_name || c.sme_a_id || '', c.sme_b_name || c.sme_b_id || '',
      c.status || '', c.resolution_method || '', c.resolution_notes || ''
    ]);
  }
  const clSheet = xlsx.utils.aoa_to_sheet(clData);
  clSheet['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 35 }];
  xlsx.utils.book_append_sheet(wb, clSheet, 'Conflict Log');

  // ── Sheet 6: SME Register ──
  const smeList = data.smes || [];
  const smeData = [['Name', 'Email', 'Department', 'Role', 'Interview Status', 'Stages Owned']];
  for (const s of smeList) {
    smeData.push([
      s.full_name || '', s.email || '', s.department || '', s.role || '',
      s.interview_status || '', (s.stages || []).join(', ')
    ]);
  }
  const smeSheet = xlsx.utils.aoa_to_sheet(smeData);
  smeSheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 }];
  xlsx.utils.book_append_sheet(wb, smeSheet, 'SME Register');

  // ── Sheet 7: Support Function Map ──
  const sfData = [['Journey Stage', 'Support Role', 'Department', 'Role Description', 'SOP Status', 'Key Gaps']];
  for (const s of jmStages) {
    const smes = s.supporting_smes || [];
    const stageGaps = gapList.filter(g => g.journey_stage === s.stage_id || g.journey_stage === s.journey_stage);
    const stageProcs = procs.filter(p => p.journey_stage === s.journey_stage);
    const hasSop = stageProcs.some(p => p.as_documented);

    if (smes.length) {
      for (const sme of smes) {
        sfData.push([
          s.journey_stage,
          sme,
          '', // Department not available per-stage SME
          '',
          hasSop ? 'Has SOP' : 'No SOP',
          stageGaps.map(g => g.title).join('; ') || '--'
        ]);
      }
    } else {
      sfData.push([
        s.journey_stage,
        '--', '', '',
        hasSop ? 'Has SOP' : 'No SOP',
        stageGaps.map(g => g.title).join('; ') || '--'
      ]);
    }
  }
  const sfSheet = xlsx.utils.aoa_to_sheet(sfData);
  sfSheet['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 50 }];
  xlsx.utils.book_append_sheet(wb, sfSheet, 'Support Function Map');

  // ── Sheet 8: Application Register (full tech list) ──
  const arData = [['Category', 'Application', 'Vendor', 'Environment', 'Integrations', 'Manual Workarounds', 'Journey Stages']];
  // Sort by category
  const sortedSystems = [...systems].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  for (const s of sortedSystems) {
    arData.push([
      s.category || '',
      s.system_name,
      s.vendor || '',
      s.environment || '',
      flattenList(s.integration_links),
      flattenList(s.manual_workarounds),
      '' // Journey stages not directly on tech data in spreadsheet endpoint
    ]);
  }
  const arSheet = xlsx.utils.aoa_to_sheet(arData);
  arSheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 35 }, { wch: 35 }];
  xlsx.utils.book_append_sheet(wb, arSheet, 'Application Register');

  // ── Sheet 9: Journey × Technology Matrix ──
  // Cross-reference: rows = systems, columns = journey stages
  const stageNames = jmStages.map(s => s.journey_stage);
  const jtHeader = ['System', 'Category', ...stageNames];
  const jtData = [jtHeader];

  // Build stage → touchpoint names map
  const stageTpMap = {};
  for (const s of jmStages) {
    const tps = (s.technology_touchpoints_json || []).map(tp =>
      (typeof tp === 'string' ? tp : (tp.system || tp.name || '')).toLowerCase()
    );
    stageTpMap[s.journey_stage] = tps;
  }

  for (const sys of sortedSystems) {
    const row = [sys.system_name, sys.category || ''];
    for (const stage of stageNames) {
      const tps = stageTpMap[stage] || [];
      const match = tps.some(tp => tp.includes(sys.system_name.toLowerCase()) || sys.system_name.toLowerCase().includes(tp));
      row.push(match ? '✓' : '');
    }
    jtData.push(row);
  }
  const jtSheet = xlsx.utils.aoa_to_sheet(jtData);
  const jtCols = [{ wch: 25 }, { wch: 22 }];
  for (const _ of stageNames) jtCols.push({ wch: 18 });
  jtSheet['!cols'] = jtCols;
  xlsx.utils.book_append_sheet(wb, jtSheet, 'Journey × Technology');

  // Download
  const timestamp = new Date().toISOString().slice(0, 10);
  xlsx.writeFile(wb, `Journey_Map_${timestamp}.xlsx`);
}
