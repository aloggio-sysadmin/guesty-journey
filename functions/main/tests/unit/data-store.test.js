'use strict';

const { query, insert, update, deleteRow, getByField, getAllByField } = require('../../utils/data-store');
const { createMockApp } = require('../test-utils/mock-catalyst');

describe('data-store', () => {
  let app;

  beforeEach(() => {
    app = createMockApp({
      store: {
        SMERegister: [
          { ROWID: '1', sme_id: 'SME-001', full_name: 'Alice', department: 'Front Office' },
          { ROWID: '2', sme_id: 'SME-002', full_name: 'Bob',   department: 'F&B' }
        ]
      }
    });
  });

  describe('query', () => {
    test('returns all rows with SELECT *', async () => {
      const rows = await query(app, 'SELECT * FROM SMERegister');
      expect(rows).toHaveLength(2);
      expect(rows[0].sme_id).toBe('SME-001');
    });

    test('filters with WHERE clause', async () => {
      const rows = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'SME-001'");
      expect(rows).toHaveLength(1);
      expect(rows[0].full_name).toBe('Alice');
    });

    test('returns empty array for no matches', async () => {
      const rows = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'NONE'");
      expect(rows).toHaveLength(0);
    });

    test('returns COUNT', async () => {
      const rows = await query(app, 'SELECT COUNT(*) as cnt FROM SMERegister');
      expect(rows[0].cnt).toBe('2');
    });

    test('returns empty array for empty table', async () => {
      const rows = await query(app, 'SELECT * FROM GapRegister');
      expect(rows).toEqual([]);
    });
  });

  describe('insert', () => {
    test('inserts a row and assigns ROWID', async () => {
      const row = await insert(app, 'GapRegister', { gap_id: 'GAP-001', title: 'Test gap' });
      expect(row.ROWID).toBeDefined();
      expect(row.gap_id).toBe('GAP-001');
    });

    test('inserted row is queryable', async () => {
      await insert(app, 'GapRegister', { gap_id: 'GAP-002', title: 'Another gap' });
      const rows = await query(app, "SELECT * FROM GapRegister WHERE gap_id = 'GAP-002'");
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Another gap');
    });
  });

  describe('update', () => {
    test('updates an existing row', async () => {
      await update(app, 'SMERegister', '1', { full_name: 'Alice Updated' });
      const rows = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'SME-001'");
      expect(rows[0].full_name).toBe('Alice Updated');
    });

    test('preserves other fields on update', async () => {
      await update(app, 'SMERegister', '1', { department: 'Rooms' });
      const rows = await query(app, "SELECT * FROM SMERegister WHERE sme_id = 'SME-001'");
      expect(rows[0].full_name).toBe('Alice'); // unchanged
      expect(rows[0].department).toBe('Rooms');
    });
  });

  describe('deleteRow', () => {
    test('deletes a row by ROWID', async () => {
      await deleteRow(app, 'SMERegister', '1');
      const rows = await query(app, 'SELECT * FROM SMERegister');
      expect(rows).toHaveLength(1);
      expect(rows[0].sme_id).toBe('SME-002');
    });
  });

  describe('getByField', () => {
    test('returns matching row', async () => {
      const row = await getByField(app, 'SMERegister', 'sme_id', 'SME-002');
      expect(row.full_name).toBe('Bob');
    });

    test('returns null if not found', async () => {
      const row = await getByField(app, 'SMERegister', 'sme_id', 'NONE');
      expect(row).toBeNull();
    });
  });

  describe('getAllByField', () => {
    test('returns all matching rows', async () => {
      const rows = await getAllByField(app, 'SMERegister', 'department', 'Front Office');
      expect(rows).toHaveLength(1);
    });

    test('returns empty array if no matches', async () => {
      const rows = await getAllByField(app, 'SMERegister', 'department', 'Nonexistent');
      expect(rows).toEqual([]);
    });
  });
});
