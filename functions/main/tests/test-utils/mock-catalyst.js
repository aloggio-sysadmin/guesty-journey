'use strict';

/**
 * In-memory mock for the Catalyst SDK (zcatalyst-sdk-node).
 * Provides a fake DataStore and ZCQL engine backed by plain JS objects.
 */

class MockTable {
  constructor(name, store) {
    this.name = name;
    this.store = store;
    if (!this.store[name]) this.store[name] = [];
  }

  insertRow(data) {
    const row = { ROWID: String(this.store[this.name].length + 1), ...data };
    this.store[this.name].push(row);
    return Promise.resolve(row);
  }

  updateRow(data) {
    const idx = this.store[this.name].findIndex(r => r.ROWID === data.ROWID);
    if (idx !== -1) {
      this.store[this.name][idx] = { ...this.store[this.name][idx], ...data };
    }
    return Promise.resolve(this.store[this.name][idx] || null);
  }

  deleteRow(rowId) {
    this.store[this.name] = this.store[this.name].filter(r => r.ROWID !== rowId);
    return Promise.resolve();
  }
}

class MockDataStore {
  constructor(store) { this.store = store; }
  table(name) { return new MockTable(name, this.store); }
}

class MockZcql {
  constructor(store) { this.store = store; }

  executeZCQLQuery(zcql) {
    // Supports: SELECT * / COUNT(*) FROM Table [WHERE field = 'val'] [ORDER BY ...]
    const isCount = /COUNT\(\*\)/i.test(zcql);
    const fromMatch = zcql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return Promise.resolve([]);
    const tableName = fromMatch[1];
    const rows = this.store[tableName] || [];

    let filtered = rows;
    const whereMatch = zcql.match(/WHERE\s+(\w+)\s*=\s*'([^']*)'/i);
    if (whereMatch) {
      const [, field, value] = whereMatch;
      filtered = rows.filter(r => String(r[field] ?? '') === value);
    }

    if (isCount) {
      return Promise.resolve([{ [tableName]: { cnt: String(filtered.length), CNT: String(filtered.length) } }]);
    }
    return Promise.resolve(filtered.map(row => ({ [tableName]: row })));
  }
}

class MockSegments {
  constructor(overrides = {}) { this.overrides = overrides; }
  getValue(key) { return Promise.resolve(this.overrides[key] || null); }
}

class MockCache {
  constructor(segments) { this._segments = segments; }
  segment() { return this._segments; }
}

/**
 * Create a mock Catalyst app.
 * @param {{ store?: object, segments?: object }} options
 */
function createMockApp(options = {}) {
  const store = options.store || {};
  const segments = new MockSegments(options.segments || {
    CLAUDE_API_KEY: 'test-claude-key',
    JWT_SECRET: 'test-jwt-secret',
    JWT_EXPIRY: '1d',
    CLAUDE_MODEL: 'claude-haiku-4-5-20251001'
  });

  return {
    _store: store,
    datastore: () => new MockDataStore(store),
    zcql: () => new MockZcql(store),
    cache: () => new MockCache(segments)
  };
}

function resetStore(app) {
  const store = app._store;
  for (const key of Object.keys(store)) store[key] = [];
}

function seedTable(app, tableName, rows) {
  app._store[tableName] = rows.map((r, i) => ({ ROWID: String(i + 1), ...r }));
}

module.exports = { createMockApp, resetStore, seedTable };
