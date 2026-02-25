'use strict';

/**
 * Safe JSON parse — returns parsed value or defaultValue if invalid.
 */
function safeParse(text, defaultValue = null) {
  if (text === null || text === undefined || text === '') return defaultValue;
  if (typeof text === 'object') return text; // already parsed
  try {
    return JSON.parse(text);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Safe JSON stringify — returns '{}' if input is null/undefined.
 */
function safeStringify(obj) {
  if (obj === null || obj === undefined) return '{}';
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return '{}';
  }
}

/**
 * Merge new items into an existing JSON array string.
 * Deduplicates by idField if provided.
 * Returns the stringified merged array.
 */
function mergeJsonArrays(existingJson, newItems, idField = null) {
  const existing = safeParse(existingJson, []);
  const arr = Array.isArray(existing) ? existing : [];
  const incoming = Array.isArray(newItems) ? newItems : [newItems].filter(Boolean);

  if (!idField) {
    return safeStringify([...arr, ...incoming]);
  }

  const map = new Map();
  for (const item of arr) {
    if (item && item[idField]) map.set(item[idField], item);
  }
  for (const item of incoming) {
    if (item && item[idField]) map.set(item[idField], item);
  }
  return safeStringify(Array.from(map.values()));
}

/**
 * Add a single value to a JSON array of primitives (deduped).
 */
function addToJsonArray(existingJson, value) {
  const arr = safeParse(existingJson, []);
  const list = Array.isArray(arr) ? arr : [];
  if (!list.includes(value)) list.push(value);
  return safeStringify(list);
}

module.exports = { safeParse, safeStringify, mergeJsonArrays, addToJsonArray };
