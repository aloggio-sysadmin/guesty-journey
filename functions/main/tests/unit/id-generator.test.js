'use strict';

const { generateId } = require('../../utils/id-generator');
const { createMockApp } = require('../test-utils/mock-catalyst');

describe('generateId', () => {
  let app;

  beforeEach(() => {
    app = createMockApp({
      store: {
        Counters: [
          { ROWID: '1', counter_name: 'SME',  current_value: '0', prefix: 'SME-',     padding: '3' },
          { ROWID: '2', counter_name: 'PROC', current_value: '5', prefix: 'PROC-',    padding: '3' },
          { ROWID: '3', counter_name: 'GAP',  current_value: '99', prefix: 'GAP-',   padding: '3' }
        ]
      }
    });
  });

  test('generates first SME id correctly', async () => {
    const id = await generateId(app, 'SME');
    expect(id).toBe('SME-001');
  });

  test('increments from existing counter value', async () => {
    const id = await generateId(app, 'PROC');
    expect(id).toBe('PROC-006');
  });

  test('pads to correct width', async () => {
    const id = await generateId(app, 'GAP');
    expect(id).toBe('GAP-100');
  });

  test('increments counter each call', async () => {
    const id1 = await generateId(app, 'SME');
    const id2 = await generateId(app, 'SME');
    expect(id1).toBe('SME-001');
    expect(id2).toBe('SME-002');
  });

  test('throws for unknown prefix', async () => {
    await expect(generateId(app, 'UNKNOWN')).rejects.toThrow();
  });
});
