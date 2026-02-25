'use strict';

const { query } = require('../utils/data-store');
const { safeParse } = require('../utils/json-helpers');
const { callClaudeForSummary } = require('../services/claude-client');
const { getConfig } = require('../config');

/**
 * POST /reports/journey-map
 * Returns all JourneyMap stages with parsed JSON arrays.
 */
async function journeyMap(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM JourneyMap ORDER BY journey_stage');
  const stages = rows.map(r => ({
    stage_id: r.stage_id,
    journey_stage: r.journey_stage,
    stage_description: r.stage_description || '',
    guest_actions_json: safeParse(r.guest_actions_json, []),
    frontstage_interactions_json: safeParse(r.frontstage_interactions_json, []),
    backstage_processes_json: safeParse(r.backstage_processes_json, []),
    technology_touchpoints_json: safeParse(r.technology_touchpoints_json, []),
    failure_points_json: safeParse(r.failure_points_json, []),
    supporting_sme_ids_json: safeParse(r.supporting_sme_ids_json, [])
  }));

  // Enrich with SME names
  const smeCache = {};
  for (const stage of stages) {
    const enrichedSmes = [];
    for (const smeId of stage.supporting_sme_ids_json) {
      if (!smeCache[smeId]) {
        const rows2 = await query(catalystApp, `SELECT full_name FROM SMERegister WHERE sme_id = '${smeId}'`);
        smeCache[smeId] = rows2[0]?.full_name || smeId;
      }
      enrichedSmes.push(smeCache[smeId]);
    }
    stage.supporting_smes = enrichedSmes;
  }

  return {
    report: 'journey-map',
    generated_at: new Date().toISOString(),
    stage_count: stages.length,
    stages
  };
}

/**
 * POST /reports/process-inventory
 * Returns all ProcessInventory records enriched with owner SME name.
 */
async function processInventory(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM ProcessInventory ORDER BY journey_stage, process_name');

  const smeCache = {};
  const getSme = async (smeId) => {
    if (!smeId) return '';
    if (!smeCache[smeId]) {
      const r = await query(catalystApp, `SELECT full_name FROM SMERegister WHERE sme_id = '${smeId}'`);
      smeCache[smeId] = r[0]?.full_name || smeId;
    }
    return smeCache[smeId];
  };

  const processes = await Promise.all(rows.map(async p => ({
    process_id: p.process_id,
    process_name: p.process_name,
    journey_stage: p.journey_stage,
    sub_stage: p.sub_stage || '',
    maturity: p.maturity || 'ad_hoc',
    discrepancy_flag: p.discrepancy_flag === true || p.discrepancy_flag === 'true',
    discrepancy_notes: p.discrepancy_notes || '',
    as_documented: p.as_documented || '',
    as_practiced: p.as_practiced || '',
    steps: safeParse(p.steps_json, []),
    conflict_flag: p.conflict_flag === true || p.conflict_flag === 'true',
    owner_sme_name: await getSme(p.owner_sme_id),
    source_smes: safeParse(p.source_sme_ids_json, [])
  })));

  const discrepancyCount = processes.filter(p => p.discrepancy_flag).length;
  const conflictCount    = processes.filter(p => p.conflict_flag).length;
  const maturityCounts   = processes.reduce((acc, p) => {
    acc[p.maturity] = (acc[p.maturity] || 0) + 1;
    return acc;
  }, {});

  return {
    report: 'process-inventory',
    generated_at: new Date().toISOString(),
    process_count: processes.length,
    discrepancy_count: discrepancyCount,
    conflict_count: conflictCount,
    maturity_breakdown: maturityCounts,
    processes
  };
}

/**
 * POST /reports/tech-ecosystem
 * Returns all TechEcosystem records.
 */
async function techEcosystem(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM TechEcosystem ORDER BY category, system_name');

  const systems = rows.map(s => ({
    system_id: s.system_id,
    system_name: s.system_name,
    vendor: s.vendor || '',
    category: s.category || 'Other',
    environment: s.environment || '',
    integration_links: safeParse(s.integration_links_json, []),
    manual_workarounds: safeParse(s.manual_workarounds_json, []),
    users: safeParse(s.users_json, []),
    source_smes: safeParse(s.source_sme_ids_json, [])
  }));

  const categoryBreakdown = systems.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  const systemsWithWorkarounds = systems.filter(s => s.manual_workarounds.length > 0);
  const integrationCount = systems.reduce((n, s) => n + s.integration_links.length, 0);

  return {
    report: 'tech-ecosystem',
    generated_at: new Date().toISOString(),
    system_count: systems.length,
    category_breakdown: categoryBreakdown,
    systems_with_manual_workarounds: systemsWithWorkarounds.length,
    total_integration_links: integrationCount,
    systems
  };
}

/**
 * POST /reports/gap-opportunity
 * Returns all GapRegister records.
 */
async function gapOpportunity(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM GapRegister ORDER BY guest_impact DESC, journey_stage_id');

  const gaps = rows.map(g => ({
    gap_id: g.gap_id,
    title: g.title,
    description: g.description || '',
    journey_stage: g.journey_stage_id || '',
    process_id: g.process_id || '',
    gap_type: g.gap_type || 'other',
    root_cause: g.root_cause || '',
    frequency: g.frequency || '',
    guest_impact: g.guest_impact || 'medium',
    business_impact: g.business_impact || '',
    financial_impact_estimate: g.financial_impact_estimate || '',
    confirmed_by_multiple_smes: g.confirmed_by_multiple_smes === true || g.confirmed_by_multiple_smes === 'true',
    status: g.status || 'open',
    opportunity: safeParse(g.opportunity_json, {})
  }));

  const statusCounts   = { open: 0, in_progress: 0, resolved: 0 };
  const impactCounts   = { high: 0, medium: 0, low: 0 };
  const typeCounts     = {};

  for (const g of gaps) {
    if (statusCounts[g.status] !== undefined) statusCounts[g.status]++;
    if (impactCounts[g.guest_impact] !== undefined) impactCounts[g.guest_impact]++;
    typeCounts[g.gap_type] = (typeCounts[g.gap_type] || 0) + 1;
  }

  return {
    report: 'gap-opportunity',
    generated_at: new Date().toISOString(),
    gap_count: gaps.length,
    status_breakdown: statusCounts,
    impact_breakdown: impactCounts,
    type_breakdown: typeCounts,
    confirmed_by_multiple_smes: gaps.filter(g => g.confirmed_by_multiple_smes).length,
    gaps
  };
}

/**
 * POST /reports/conflict-resolution
 * Returns all ConflictLog records with resolution status.
 */
async function conflictResolution(catalystApp) {
  const rows = await query(catalystApp, 'SELECT * FROM ConflictLog ORDER BY status, journey_stage');

  const smeCache = {};
  const getSme = async (smeId) => {
    if (!smeId) return '';
    if (!smeCache[smeId]) {
      const r = await query(catalystApp, `SELECT full_name FROM SMERegister WHERE sme_id = '${smeId}'`);
      smeCache[smeId] = r[0]?.full_name || smeId;
    }
    return smeCache[smeId];
  };

  const conflicts = await Promise.all(rows.map(async c => ({
    conflict_id: c.conflict_id,
    description: c.description,
    conflict_type: c.conflict_type || '',
    journey_stage: c.journey_stage || '',
    process_id: c.process_id || '',
    sme_a_id: c.sme_a_id || '',
    sme_b_id: c.sme_b_id || '',
    sme_a_name: await getSme(c.sme_a_id),
    sme_b_name: await getSme(c.sme_b_id),
    status: c.status || 'open',
    resolution_method: c.resolution_method || '',
    resolution_notes: c.resolution_notes || '',
    resolved_by: c.resolved_by || '',
    created_at: c.created_at
  })));

  const statusCounts = conflicts.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  return {
    report: 'conflict-resolution',
    generated_at: new Date().toISOString(),
    conflict_count: conflicts.length,
    open_count: statusCounts.open || 0,
    resolved_count: statusCounts.resolved || 0,
    status_breakdown: statusCounts,
    conflicts
  };
}

/**
 * POST /reports/executive-summary
 * Calls Claude to generate an AI executive summary.
 */
async function executiveSummary(catalystApp) {
  const config = await getConfig(catalystApp);

  // Gather counts in parallel
  const [smeRows, sessionRows, processRows, gapRows, conflictRows, systemRows, stageRows] =
    await Promise.all([
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM SMERegister'),
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM Sessions'),
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM ProcessInventory'),
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM GapRegister'),
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM ConflictLog'),
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM TechEcosystem'),
      query(catalystApp, 'SELECT COUNT(*) as cnt FROM JourneyMap')
    ]);

  const getCount = (rows) => parseInt(rows[0]?.cnt || rows[0]?.CNT || '0', 10) || 0;

  const stats = {
    sme_count:      getCount(smeRows),
    session_count:  getCount(sessionRows),
    process_count:  getCount(processRows),
    gap_count:      getCount(gapRows),
    conflict_count: getCount(conflictRows),
    system_count:   getCount(systemRows),
    stage_count:    getCount(stageRows)
  };

  // Fetch high-impact gaps for context
  const highGaps = await query(catalystApp,
    "SELECT title, journey_stage_id, gap_type FROM GapRegister WHERE guest_impact = 'high' AND status = 'open'"
  );

  // Fetch open conflicts
  const openConflicts = await query(catalystApp,
    "SELECT description, conflict_type FROM ConflictLog WHERE status = 'open'"
  );

  const systemPrompt = `You are a hospitality consulting expert preparing an executive summary for senior leadership.
Write a professional, actionable summary based on the provided data statistics and findings.
Structure it with: Executive Overview, Key Findings, Critical Gaps, Open Conflicts, Technology Observations, and Strategic Recommendations.
Be concise and business-focused. Respond as JSON: {"reply": "...full summary text..."}`;

  const messages = [{
    role: 'user',
    content: `Guest Journey Mapping Project — Executive Summary Data:

Statistics:
- SMEs interviewed: ${stats.sme_count}
- Interview sessions completed: ${stats.session_count}
- Journey stages mapped: ${stats.stage_count}
- Processes documented: ${stats.process_count}
- Gaps identified: ${stats.gap_count}
- Technology systems: ${stats.system_count}
- Open conflicts: ${stats.conflict_count}

High-impact open gaps (${highGaps.length}):
${highGaps.map(g => `- [${g.journey_stage_id}] ${g.title} (${g.gap_type})`).join('\n') || 'None'}

Open conflicts (${openConflicts.length}):
${openConflicts.map(c => `- ${c.description} (${c.conflict_type})`).join('\n') || 'None'}

Generate a comprehensive executive summary.`
  }];

  let summary = '';
  try {
    const response = await callClaudeForSummary(systemPrompt, messages, config);
    summary = response.reply || JSON.stringify(response);
  } catch (e) {
    summary = `Journey mapping project summary: ${stats.sme_count} SMEs interviewed across ${stats.stage_count} journey stages. ` +
      `Documented ${stats.process_count} processes, ${stats.system_count} systems, ${stats.gap_count} gaps, ` +
      `${stats.conflict_count} conflicts.`;
  }

  return {
    report: 'executive-summary',
    generated_at: new Date().toISOString(),
    statistics: stats,
    high_impact_gaps: highGaps.length,
    open_conflicts: openConflicts.length,
    summary
  };
}

/**
 * Dispatcher — called by the router for POST /reports/:type
 */
async function generate(catalystApp, params) {
  const type = params.type || params.id || '';
  switch (type) {
    case 'journey-map':         return journeyMap(catalystApp);
    case 'process-inventory':   return processInventory(catalystApp);
    case 'tech-ecosystem':      return techEcosystem(catalystApp);
    case 'gap-opportunity':     return gapOpportunity(catalystApp);
    case 'conflict-resolution': return conflictResolution(catalystApp);
    case 'executive-summary':   return executiveSummary(catalystApp);
    default: {
      const e = new Error(`Unknown report type: ${type}`);
      e.status = 400;
      throw e;
    }
  }
}

module.exports = {
  generate,
  journeyMap,
  processInventory,
  techEcosystem,
  gapOpportunity,
  conflictResolution,
  executiveSummary
};
