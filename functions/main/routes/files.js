'use strict';

const fs = require('fs');
const path = require('path');
const { getByField, update } = require('../utils/data-store');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { verifySmeToken } = require('../middleware/auth');

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg'
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SOP_FOLDER_NAME = 'sop_files';

async function getOrCreateFolder(catalystApp) {
  const filestore = catalystApp.filestore();
  const folders = await filestore.getAllFolders();
  const existing = folders.find(f => {
    const name = f.folder_name || (f._folderDetails && f._folderDetails.folder_name);
    return name === SOP_FOLDER_NAME;
  });
  if (existing) return existing;
  return filestore.createFolder(SOP_FOLDER_NAME);
}

function getFolderId(folder) {
  return folder.id || (folder._folderDetails && folder._folderDetails.id);
}

// POST /files/sop/upload  (SME public route — token authenticated)
async function uploadSop(catalystApp, params, body) {
  const { token, stage, filename, content_type, base64_data } = body;

  const tokenData = await verifySmeToken(catalystApp, token);
  const sme_id = tokenData.sme_id;

  if (!stage || !filename || !content_type || !base64_data) {
    const e = new Error('Missing required fields: stage, filename, content_type, base64_data');
    e.status = 400; throw e;
  }
  if (!ALLOWED_TYPES.has(content_type)) {
    const e = new Error('File type not allowed. Accepted: PDF, Word, TXT, PNG, JPEG');
    e.status = 400; throw e;
  }

  const buffer = Buffer.from(base64_data, 'base64');
  if (buffer.length > MAX_FILE_SIZE) {
    const e = new Error('File too large. Maximum size is 10MB.');
    e.status = 400; throw e;
  }

  const tmpPath = path.join('/tmp', `sop_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    const folder = await getOrCreateFolder(catalystApp);
    const folderId = getFolderId(folder);
    const readStream = fs.createReadStream(tmpPath);
    const uploadResult = await catalystApp.filestore().folder(folderId).uploadFile({
      code: readStream,
      name: `${sme_id}_${stage}_${filename}`
    });

    const fileId = uploadResult.id || uploadResult.file_id;

    // Update SME record with file reference
    const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', sme_id);
    if (!sme) { const e = new Error('SME not found'); e.status = 404; throw e; }

    const sopFiles = safeParse(sme.sop_files_json, {});

    // Delete old file for this stage if replacing
    if (sopFiles[stage] && sopFiles[stage].file_id) {
      try {
        await catalystApp.filestore().folder(folderId).deleteFile(sopFiles[stage].file_id);
      } catch (delErr) { /* non-fatal if old file already gone */ }
    }

    sopFiles[stage] = {
      file_id: String(fileId),
      folder_id: String(folderId),
      filename,
      content_type,
      size_bytes: buffer.length,
      uploaded_at: new Date().toISOString()
    };

    await update(catalystApp, 'SMERegister', sme.ROWID, {
      sop_files_json: safeStringify(sopFiles),
      updated_at: new Date().toISOString()
    });

    return { success: true, stage, filename, file_id: String(fileId) };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
  }
}

// GET /files/sop/:smeId  (admin route)
async function listSopFiles(catalystApp, params) {
  const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', params.smeId);
  if (!sme) { const e = new Error('SME not found'); e.status = 404; throw e; }
  return safeParse(sme.sop_files_json, {});
}

// GET /files/sop/:smeId/:stage/download  (admin route)
async function downloadSop(catalystApp, params) {
  const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', params.smeId);
  if (!sme) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const sopFiles = safeParse(sme.sop_files_json, {});
  const fileInfo = sopFiles[params.stage];
  if (!fileInfo) { const e = new Error('No SOP file for this stage'); e.status = 404; throw e; }

  const buffer = await catalystApp.filestore().folder(fileInfo.folder_id).downloadFile(fileInfo.file_id);

  return {
    filename: fileInfo.filename,
    content_type: fileInfo.content_type,
    base64_data: buffer.toString('base64')
  };
}

module.exports = { uploadSop, listSopFiles, downloadSop };
