'use strict';

const { query, update } = require('./data-store');

const MAX_RETRIES = 5;

/**
 * Atomic, concurrency-safe ID generation using the Counters table.
 * prefix: 'SME' | 'SESSION' | 'MSG' | 'SYS' | 'PROC' | 'STAGE' | 'GAP' | 'CONF' | 'TP' | 'Q'
 * Returns e.g. 'SME-001', 'PROC-014', 'GAP-103'
 */
async function generateId(catalystApp, prefix) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const rows = await query(
      catalystApp,
      `SELECT * FROM Counters WHERE counter_name = '${prefix}'`
    );

    if (!rows || rows.length === 0) {
      throw new Error(`Counter not found for prefix: ${prefix}. Run /admin/seed first.`);
    }

    const row = rows[0];
    const currentValue = parseInt(row.current_value, 10) || 0;
    const newValue = currentValue + 1;
    const rowId = row.ROWID;

    try {
      await update(catalystApp, 'Counters', rowId, { current_value: newValue });
      return `${prefix}-${String(newValue).padStart(3, '0')}`;
    } catch (err) {
      // Optimistic lock failure — retry
      if (attempt < MAX_RETRIES - 1) {
        await sleep(20 * (attempt + 1));
        continue;
      }
      throw new Error(`Failed to generate ID for ${prefix} after ${MAX_RETRIES} attempts`);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generateId };
