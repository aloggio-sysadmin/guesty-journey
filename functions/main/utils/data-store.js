'use strict';

/**
 * ZCQL wrapper — every database interaction goes through this module.
 * CRITICAL: ZCQL results wrapped as result[0].TableName.column — always unwrap.
 */

function escapeZCQL(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''");
}

async function query(catalystApp, zcqlQuery) {
  const zcql = catalystApp.zcql();
  const result = await zcql.executeZCQLQuery(zcqlQuery);
  if (!result || !Array.isArray(result) || result.length === 0) return [];
  return result.map(row => {
    const tableKey = Object.keys(row)[0];
    return row[tableKey];
  });
}

async function insert(catalystApp, tableName, rowData) {
  const table = catalystApp.datastore().table(tableName);
  return table.insertRow(rowData);
}

async function update(catalystApp, tableName, rowId, rowData) {
  const table = catalystApp.datastore().table(tableName);
  return table.updateRow({ ROWID: rowId, ...rowData });
}

async function deleteRow(catalystApp, tableName, rowId) {
  const table = catalystApp.datastore().table(tableName);
  await table.deleteRow(rowId);
}

async function getByField(catalystApp, tableName, fieldName, value) {
  const rows = await query(
    catalystApp,
    `SELECT * FROM ${tableName} WHERE ${fieldName} = '${escapeZCQL(value)}'`
  );
  return rows.length > 0 ? rows[0] : null;
}

async function getAllByField(catalystApp, tableName, fieldName, value) {
  return query(
    catalystApp,
    `SELECT * FROM ${tableName} WHERE ${fieldName} = '${escapeZCQL(value)}'`
  );
}

async function getRowId(catalystApp, tableName, fieldName, value) {
  const row = await getByField(catalystApp, tableName, fieldName, value);
  return row ? row.ROWID : null;
}

module.exports = { query, insert, update, deleteRow, getByField, getAllByField, getRowId, escapeZCQL };
