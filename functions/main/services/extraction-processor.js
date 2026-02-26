'use strict';

const { query, insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify, mergeJsonArrays, addToJsonArray } = require('../utils/json-helpers');

/**
 * Process all extractions from a Claude response and write to Data Store.
 * Returns a summary of records created/updated.
 */
async function processExtractions(catalystApp, extractions, smeId, sessionId, userId, currentStage) {
  if (!extractions) return { systems: [], processes: [], gaps: [], touchpoints: [] };

  const created = { systems: [], processes: [], gaps: [], touchpoints: [] };

  // ── SYSTEMS ──────────────────────────────────────────────────────────────
  for (const sys of (extractions.systems || [])) {
    try {
      if (sys.is_new) {
        const system_id = await generateId(catalystApp, 'SYS');
        const now = new Date().toISOString();
        await insert(catalystApp, 'TechEcosystem', {
          system_id,
          system_name: sys.system_name || 'Unknown',
          vendor: sys.vendor || '',
          category: sys.category || 'Other',
          primary_owner_sme_id: smeId,
          users_json: safeStringify([smeId]),
          environment: 'production',
          integration_links_json: safeStringify(sys.integration_with || []),
          manual_workarounds_json: '[]',
          source_sme_ids_json: safeStringify([smeId]),
          created_by: userId,
          created_at: now,
          updated_at: now
        });
        created.systems.push({ action: 'created', system_id, system_name: sys.system_name });
      } else if (sys.existing_system_id) {
        const existing = await getByField(catalystApp, 'TechEcosystem', 'system_id', sys.existing_system_id);
        if (existing) {
          const updatedUsers = addToJsonArray(existing.users_json, smeId);
          const updatedSources = addToJsonArray(existing.source_sme_ids_json, smeId);
          const mergedIntegrations = mergeJsonArrays(
            existing.integration_links_json,
            sys.integration_with || [],
            'system_name'
          );
          await update(catalystApp, 'TechEcosystem', existing.ROWID, {
            users_json: updatedUsers,
            source_sme_ids_json: updatedSources,
            integration_links_json: mergedIntegrations,
            updated_at: new Date().toISOString()
          });
          created.systems.push({ action: 'updated', system_id: sys.existing_system_id, system_name: sys.system_name });
        }
      }
    } catch (e) {
      console.error('[extraction-processor] System error:', e.message);
    }
  }

  // ── PROCESS STEPS ─────────────────────────────────────────────────────────
  // Group by belongs_to_process
  const stepsByProcess = {};
  for (const step of (extractions.process_steps || [])) {
    const key = step.belongs_to_process || `__new_${step.journey_stage || currentStage}`;
    if (!stepsByProcess[key]) stepsByProcess[key] = [];
    stepsByProcess[key].push(step);
  }

  for (const [processKey, steps] of Object.entries(stepsByProcess)) {
    try {
      const stage = steps[0].journey_stage || currentStage;
      const as_documented = steps[0].as_documented || '';
      const as_practiced = steps[0].as_practiced || '';
      const hasDiscrepancy = as_documented && as_practiced && as_documented.trim() !== as_practiced.trim();

      if (processKey.startsWith('__new_')) {
        // Create new process
        const process_id = await generateId(catalystApp, 'PROC');
        const now = new Date().toISOString();
        const processName = steps.map(s => s.description).join('; ').slice(0, 100) || 'Process from interview';

        await insert(catalystApp, 'ProcessInventory', {
          process_id,
          process_name: processName,
          journey_stage: stage,
          sub_stage: '',
          owner_sme_id: smeId,
          supporting_sme_ids_json: safeStringify([smeId]),
          trigger_json: '{}',
          steps_json: safeStringify(steps),
          handoffs_json: '[]',
          maturity: 'ad_hoc',
          as_documented,
          as_practiced,
          discrepancy_flag: String(hasDiscrepancy),
          discrepancy_notes: hasDiscrepancy ? 'Auto-detected: documented vs practiced differ' : '',
          source_sme_ids_json: safeStringify([smeId]),
          conflict_flag: 'false',
          conflict_notes: '',
          created_by: userId,
          created_at: now,
          updated_at: now
        });
        created.processes.push({ action: 'created', process_id, step_count: steps.length });

        if (hasDiscrepancy) {
          const gap_id = await generateId(catalystApp, 'GAP');
          const now2 = new Date().toISOString();
          await insert(catalystApp, 'GapRegister', {
            gap_id,
            title: `Discrepancy: ${processName} — documented vs practiced`,
            description: `Documented: ${as_documented}. Practiced: ${as_practiced}.`,
            journey_stage_id: stage,
            process_id,
            source_sme_ids_json: safeStringify([smeId]),
            gap_type: 'missing_process',
            root_cause: 'Process not followed as documented',
            frequency: 'occasional',
            guest_impact: 'medium',
            business_impact: '',
            financial_impact_estimate: '',
            confirmed_by_multiple_smes: 'false',
            conflict_with_sme_ids_json: '[]',
            opportunity_json: '{}',
            status: 'open',
            created_by: userId,
            created_at: now2,
            updated_at: now2
          });
          created.gaps.push({ action: 'auto-created', gap_id, reason: 'discrepancy' });
        }
      } else {
        // Update existing process
        const existing = await getByField(catalystApp, 'ProcessInventory', 'process_id', processKey);
        if (existing) {
          const mergedSteps = mergeJsonArrays(existing.steps_json, steps);
          const updatedSources = addToJsonArray(existing.source_sme_ids_json, smeId);
          await update(catalystApp, 'ProcessInventory', existing.ROWID, {
            steps_json: mergedSteps,
            source_sme_ids_json: updatedSources,
            updated_at: new Date().toISOString()
          });
          created.processes.push({ action: 'updated', process_id: processKey, added_steps: steps.length });
        }
      }
    } catch (e) {
      console.error('[extraction-processor] Process error:', e.message);
    }
  }

  // ── GAPS ──────────────────────────────────────────────────────────────────
  for (const gap of (extractions.gaps || [])) {
    try {
      const gap_id = await generateId(catalystApp, 'GAP');
      const now = new Date().toISOString();
      await insert(catalystApp, 'GapRegister', {
        gap_id,
        title: gap.title || 'Untitled gap',
        description: gap.description || '',
        journey_stage_id: currentStage,
        process_id: '',
        source_sme_ids_json: safeStringify([smeId]),
        gap_type: gap.gap_type || 'other',
        root_cause: gap.root_cause || '',
        frequency: gap.frequency || 'occasional',
        guest_impact: gap.guest_impact || 'medium',
        business_impact: '',
        financial_impact_estimate: '',
        confirmed_by_multiple_smes: 'false',
        conflict_with_sme_ids_json: '[]',
        opportunity_json: '{}',
        status: 'open',
        created_by: userId,
        created_at: now,
        updated_at: now
      });
      created.gaps.push({ action: 'created', gap_id, title: gap.title });
    } catch (e) {
      console.error('[extraction-processor] Gap error:', e.message);
    }
  }

  // ── JOURNEY TOUCHPOINTS ───────────────────────────────────────────────────
  for (const tp of (extractions.journey_touchpoints || [])) {
    try {
      const stage = tp.journey_stage || currentStage;
      let journeyRow = await getByField(catalystApp, 'JourneyMap', 'journey_stage', stage);
      if (!journeyRow) {
        const stage_id = await generateId(catalystApp, 'STAGE');
        const now = new Date().toISOString();
        await insert(catalystApp, 'JourneyMap', {
          stage_id,
          journey_stage: stage,
          stage_description: '',
          guest_actions_json: '[]',
          frontstage_interactions_json: safeStringify([tp]),
          backstage_processes_json: '[]',
          technology_touchpoints_json: '[]',
          failure_points_json: '[]',
          supporting_process_ids_json: '[]',
          supporting_sme_ids_json: safeStringify([smeId]),
          created_by: userId,
          created_at: now,
          updated_at: now
        });
        created.touchpoints.push({ action: 'created journey stage', stage });
      } else {
        const merged = mergeJsonArrays(journeyRow.frontstage_interactions_json, [tp]);
        const mergedSmes = addToJsonArray(journeyRow.supporting_sme_ids_json, smeId);
        await update(catalystApp, 'JourneyMap', journeyRow.ROWID, {
          frontstage_interactions_json: merged,
          supporting_sme_ids_json: mergedSmes,
          updated_at: new Date().toISOString()
        });
        created.touchpoints.push({ action: 'updated touchpoints', stage });
      }
    } catch (e) {
      console.error('[extraction-processor] Touchpoint error:', e.message);
    }
  }

  // ── SME UPDATES ───────────────────────────────────────────────────────────
  const smeUpdates = extractions.sme_updates || {};
  if (smeId && (smeUpdates.new_systems_used?.length || smeUpdates.new_domains?.length || smeUpdates.new_stages_owned?.length)) {
    try {
      const smeRow = await getByField(catalystApp, 'SMERegister', 'sme_id', smeId);
      if (smeRow) {
        const updates = { updated_at: new Date().toISOString() };
        if (smeUpdates.new_systems_used?.length) {
          let arr = safeParse(smeRow.systems_used_json, []);
          for (const s of smeUpdates.new_systems_used) if (!arr.includes(s)) arr.push(s);
          updates.systems_used_json = safeStringify(arr);
        }
        if (smeUpdates.new_domains?.length) {
          let arr = safeParse(smeRow.domains_json, []);
          for (const d of smeUpdates.new_domains) if (!arr.includes(d)) arr.push(d);
          updates.domains_json = safeStringify(arr);
        }
        if (smeUpdates.new_stages_owned?.length) {
          let arr = safeParse(smeRow.journey_stages_owned_json, []);
          for (const s of smeUpdates.new_stages_owned) if (!arr.includes(s)) arr.push(s);
          updates.journey_stages_owned_json = safeStringify(arr);
        }
        await update(catalystApp, 'SMERegister', smeRow.ROWID, updates);
      }
    } catch (e) {
      console.error('[extraction-processor] SME update error:', e.message);
    }
  }

  return created;
}

module.exports = { processExtractions };
