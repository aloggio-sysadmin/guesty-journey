'use strict';

const { insert, update, getByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');

/**
 * Process conflicts detected by Claude and write to ConflictLog.
 * Also flags related ProcessInventory rows.
 */
async function processConflicts(catalystApp, conflictsDetected, smeId, userId) {
  if (!conflictsDetected || conflictsDetected.length === 0) return [];

  const savedConflicts = [];

  for (const conflict of conflictsDetected) {
    try {
      const conflict_id = await generateId(catalystApp, 'CONF');
      const now = new Date().toISOString();

      // Determine conflict type
      let conflictType = 'data_inconsistency';
      const field = (conflict.field || '').toLowerCase();
      if (field.includes('process') || field.includes('step')) conflictType = 'process_discrepancy';
      else if (field.includes('system') || field.includes('tech')) conflictType = 'technology_mismatch';
      else if (field.includes('owner') || field.includes('responsible')) conflictType = 'ownership_dispute';

      await insert(catalystApp, 'ConflictLog', {
        conflict_id,
        type: conflictType,
        description: `${conflict.field}: Current SME says "${conflict.new_value_from_current_sme}", existing data says "${conflict.existing_value}"`,
        sme_a_id: smeId,
        sme_b_id: conflict.existing_sme_id || '',
        sme_a_version: conflict.new_value_from_current_sme || '',
        sme_b_version: conflict.existing_value || '',
        related_process_ids_json: safeStringify(conflict.existing_record_id ? [conflict.existing_record_id] : []),
        related_gap_ids_json: '[]',
        resolution_status: 'unresolved',
        resolution_notes: '',
        resolved_by: '',
        created_by: userId,
        created_at: now
      });

      savedConflicts.push(conflict_id);

      // Flag related process if applicable
      if (conflictType === 'process_discrepancy' && conflict.existing_record_id) {
        try {
          const process = await getByField(catalystApp, 'ProcessInventory', 'process_id', conflict.existing_record_id);
          if (process) {
            const notes = process.conflict_notes
              ? `${process.conflict_notes}; ${conflict_id}`
              : conflict_id;
            await update(catalystApp, 'ProcessInventory', process.ROWID, {
              conflict_flag: 'true',
              conflict_notes: notes,
              updated_at: new Date().toISOString()
            });
          }
        } catch (e) { /* non-fatal */ }
      }
    } catch (e) {
      console.error('[conflict-detector] Error saving conflict:', e.message);
    }
  }

  return savedConflicts;
}

module.exports = { processConflicts };
