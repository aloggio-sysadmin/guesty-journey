'use strict';

const { safeParse, safeStringify, mergeJsonArrays, addToJsonArray } = require('../../utils/json-helpers');

describe('safeParse', () => {
  test('parses valid JSON string', () => {
    expect(safeParse('{"a":1}')).toEqual({ a: 1 });
  });

  test('parses valid JSON array', () => {
    expect(safeParse('["x","y"]')).toEqual(['x', 'y']);
  });

  test('returns defaultValue for invalid JSON', () => {
    expect(safeParse('not-json', [])).toEqual([]);
  });

  test('returns defaultValue for null', () => {
    expect(safeParse(null, 'default')).toBe('default');
  });

  test('returns defaultValue for undefined', () => {
    expect(safeParse(undefined, {})).toEqual({});
  });

  test('returns defaultValue for empty string', () => {
    expect(safeParse('', [])).toEqual([]);
  });

  test('returns already-parsed object as-is', () => {
    const obj = { key: 'value' };
    expect(safeParse(obj)).toBe(obj);
  });

  test('returns already-parsed array as-is', () => {
    const arr = [1, 2, 3];
    expect(safeParse(arr)).toBe(arr);
  });
});

describe('safeStringify', () => {
  test('stringifies object', () => {
    expect(safeStringify({ a: 1 })).toBe('{"a":1}');
  });

  test('stringifies array', () => {
    expect(safeStringify([1, 2])).toBe('[1,2]');
  });

  test('returns "{}" for null', () => {
    expect(safeStringify(null)).toBe('{}');
  });

  test('returns "{}" for undefined', () => {
    expect(safeStringify(undefined)).toBe('{}');
  });
});

describe('mergeJsonArrays', () => {
  test('appends new items to existing array (no idField)', () => {
    const result = mergeJsonArrays('["a"]', ['b', 'c']);
    expect(JSON.parse(result)).toEqual(['a', 'b', 'c']);
  });

  test('deduplicates by idField', () => {
    const existing = JSON.stringify([{ system_name: 'Opera', type: 'two-way' }]);
    const incoming = [{ system_name: 'Opera', type: 'one-way' }, { system_name: 'Mews', type: 'one-way' }];
    const result = JSON.parse(mergeJsonArrays(existing, incoming, 'system_name'));
    // Opera should be updated (last write wins); Mews added
    expect(result).toHaveLength(2);
    expect(result.find(r => r.system_name === 'Opera').type).toBe('one-way');
    expect(result.find(r => r.system_name === 'Mews')).toBeTruthy();
  });

  test('handles invalid JSON as empty array', () => {
    const result = mergeJsonArrays('not-json', ['new']);
    expect(JSON.parse(result)).toContain('new');
  });

  test('handles empty existing array', () => {
    const result = JSON.parse(mergeJsonArrays('[]', [{ id: 1 }]));
    expect(result).toHaveLength(1);
  });
});

describe('addToJsonArray', () => {
  test('adds value to array', () => {
    const result = JSON.parse(addToJsonArray('["a"]', 'b'));
    expect(result).toEqual(['a', 'b']);
  });

  test('does not add duplicate value', () => {
    const result = JSON.parse(addToJsonArray('["a","b"]', 'a'));
    expect(result).toEqual(['a', 'b']);
  });

  test('handles empty array', () => {
    const result = JSON.parse(addToJsonArray('[]', 'x'));
    expect(result).toEqual(['x']);
  });

  test('handles invalid JSON', () => {
    const result = JSON.parse(addToJsonArray('bad-json', 'x'));
    expect(result).toContain('x');
  });
});
