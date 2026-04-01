'use strict';

const jwt = require('jsonwebtoken');
const { query, insert, update, deleteRow, getByField, getAllByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, smeCreateSchema, smeUpdateSchema } = require('../utils/validators');
const { getConfig } = require('../config');
const { getApprovedRoles } = require('../config/journeys');

function parseSme(row) {
  if (!row) return null;
  return {
    ...row,
    contact_json: safeParse(row.contact_json, {}),
    domains_json: safeParse(row.domains_json, []),
    journey_stages_owned_json: safeParse(row.journey_stages_owned_json, []),
    systems_used_json: safeParse(row.systems_used_json, []),
    sop_files_json: safeParse(row.sop_files_json, {})
  };
}

// POST /sme
async function create(catalystApp, params, body, user) {
  const { error, value } = validate(smeCreateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const sme_id = await generateId(catalystApp, 'SME');
  const now = new Date().toISOString();

  const row = await insert(catalystApp, 'SMERegister', {
    sme_id,
    full_name: value.full_name,
    role: value.role,
    department: value.department || '',
    location: value.location || '',
    journey_type: value.journey_type || 'guest',
    contact_json: safeStringify(value.contact_json || {}),
    domains_json: safeStringify(value.domains_json || []),
    journey_stages_owned_json: safeStringify(value.journey_stages_owned_json || []),
    systems_used_json: safeStringify(value.systems_used_json || []),
    interview_status: 'pending',
    validated_by_sme: 'false',
    validation_date: '',
    created_by: user ? user.user_id : '',
    created_at: now,
    updated_at: now
  });

  return parseSme(row);
}

// GET /sme
async function list(catalystApp, params, body, user, queryParams) {
  let sql = 'SELECT * FROM SMERegister';
  const conditions = [];
  if (queryParams && queryParams.status) {
    conditions.push(`interview_status = '${queryParams.status}'`);
  }
  if (queryParams && queryParams.journey_type) {
    conditions.push(`journey_type = '${queryParams.journey_type}'`);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

  let rows = await query(catalystApp, sql);

  // Filter by stage (JSON LIKE check)
  if (queryParams && queryParams.stage) {
    rows = rows.filter(r => {
      const stages = safeParse(r.journey_stages_owned_json, []);
      return Array.isArray(stages) && stages.includes(queryParams.stage);
    });
  }

  return rows.map(parseSme);
}

// GET /sme/:id
async function get(catalystApp, params) {
  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }
  const sme = parseSme(row);
  const sessions = await getAllByField(catalystApp, 'Sessions', 'sme_id', params.id);
  return { ...sme, sessions };
}

// PUT /sme/:id
async function update_sme(catalystApp, params, body, user) {
  const { error, value } = validate(smeUpdateSchema, body);
  if (error) { const e = new Error(error); e.status = 400; throw e; }

  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const updates = { updated_at: new Date().toISOString() };
  if (value.full_name !== undefined) updates.full_name = value.full_name;
  if (value.role !== undefined) updates.role = value.role;
  if (value.department !== undefined) updates.department = value.department;
  if (value.location !== undefined) updates.location = value.location;
  if (value.contact_json !== undefined) updates.contact_json = safeStringify(value.contact_json);
  if (value.domains_json !== undefined) updates.domains_json = safeStringify(value.domains_json);
  if (value.journey_stages_owned_json !== undefined) updates.journey_stages_owned_json = safeStringify(value.journey_stages_owned_json);
  if (value.systems_used_json !== undefined) updates.systems_used_json = safeStringify(value.systems_used_json);

  const updated = await update(catalystApp, 'SMERegister', row.ROWID, updates);
  return parseSme(updated || { ...row, ...updates });
}

// POST /sme/:id/validate
async function validate_sme(catalystApp, params, body, user) {
  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const updates = {
    validated_by_sme: 'true',
    interview_status: 'validated',
    validation_date: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await update(catalystApp, 'SMERegister', row.ROWID, updates);
  return parseSme({ ...row, ...updates });
}

// POST /sme/:id/send-link
async function sendLink(catalystApp, params, body, user) {
  const row = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!row) { const e = new Error('SME not found'); e.status = 404; throw e; }

  const contact = safeParse(row.contact_json, {});
  const email = contact.email;
  if (!email) {
    const e = new Error('SME has no email address. Please add an email before sending a link.');
    e.status = 400;
    throw e;
  }

  const config = await getConfig(catalystApp);

  // Generate a 72-hour token scoped to this SME
  const token = jwt.sign(
    { sme_id: params.id, purpose: 'sme_interview' },
    config.JWT_SECRET,
    { expiresIn: '72h' }
  );

  // Build the interview link
  const domain = 'journey-7003032339.development.catalystserverless.com.au';
  const link = `https://${domain}/app/index.html#/interview/${token}`;

  // Send email via Catalyst
  try {
    const emailService = catalystApp.email();
    await emailService.sendMail({
      from_email: 'zoho-sysadmin@alloggio.com.au',
      to_email: [email],
      subject: 'Journey Mapping Interview — Your Session Link',
      html_mode: true,
      content: `<html><body style="font-family:sans-serif;color:#1e293b;padding:20px">
        <h2>Guest Journey Mapping Interview</h2>
        <p>Hi ${row.full_name},</p>
        <p>You've been invited to participate in a guest journey mapping interview. Click the link below to start your session:</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Start Interview</a></p>
        <p style="color:#64748b;font-size:13px">This link expires in 72 hours. If you have any questions, contact your project coordinator.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:32px">Journey Mapping Agent</p>
      </body></html>`
    });
  } catch (emailErr) {
    console.error('[sme] Email send error:', emailErr.message);
    const e = new Error('Failed to send email: ' + emailErr.message);
    e.status = 500;
    throw e;
  }

  // Update SME status
  await update(catalystApp, 'SMERegister', row.ROWID, {
    interview_status: 'link_sent',
    updated_at: new Date().toISOString()
  });

  return { success: true, message: `Interview link sent to ${email}` };
}

// POST /sme/bulk-send-links
async function bulkSendLinks(catalystApp, params, body, user) {
  const smeIds = body.sme_ids;
  if (!Array.isArray(smeIds) || smeIds.length === 0) {
    const e = new Error('sme_ids must be a non-empty array');
    e.status = 400;
    throw e;
  }

  const config = await getConfig(catalystApp);
  const emailService = catalystApp.email();
  const domain = 'journey-7003032339.development.catalystserverless.com.au';
  const results = [];

  for (const smeId of smeIds) {
    try {
      const row = await getByField(catalystApp, 'SMERegister', 'sme_id', smeId);
      if (!row) { results.push({ sme_id: smeId, success: false, error: 'SME not found' }); continue; }

      const contact = safeParse(row.contact_json, {});
      const email = contact.email;
      if (!email) { results.push({ sme_id: smeId, full_name: row.full_name, success: false, error: 'No email address' }); continue; }

      const token = jwt.sign(
        { sme_id: smeId, purpose: 'sme_interview' },
        config.JWT_SECRET,
        { expiresIn: '72h' }
      );
      const link = `https://${domain}/app/index.html#/interview/${token}`;

      await emailService.sendMail({
        from_email: 'zoho-sysadmin@alloggio.com.au',
        to_email: [email],
        subject: 'Journey Mapping Interview — Your Session Link',
        html_mode: true,
        content: `<html><body style="font-family:sans-serif;color:#1e293b;padding:20px">
          <h2>Guest Journey Mapping Interview</h2>
          <p>Hi ${row.full_name},</p>
          <p>You've been invited to participate in a guest journey mapping interview. Click the link below to start your session:</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Start Interview</a></p>
          <p style="color:#64748b;font-size:13px">This link expires in 72 hours. If you have any questions, contact your project coordinator.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Journey Mapping Agent</p>
        </body></html>`
      });

      await update(catalystApp, 'SMERegister', row.ROWID, {
        interview_status: 'link_sent',
        updated_at: new Date().toISOString()
      });

      results.push({ sme_id: smeId, full_name: row.full_name, email, success: true });
    } catch (err) {
      console.error(`[sme] Bulk send error for ${smeId}:`, err.message);
      results.push({ sme_id: smeId, success: false, error: err.message });
    }
  }

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  return { success: true, sent, failed, total: smeIds.length, results };
}

// DELETE /sme/:id
async function remove(catalystApp, params) {
  const sme = await getByField(catalystApp, 'SMERegister', 'sme_id', params.id);
  if (!sme) { const e = new Error('SME not found'); e.status = 404; throw e; }

  // Cascade: delete all sessions and their chat history for this SME
  try {
    const sessions = await getAllByField(catalystApp, 'Sessions', 'sme_id', params.id);
    for (const session of sessions) {
      const messages = await getAllByField(catalystApp, 'ChatHistory', 'session_id', session.session_id);
      for (const msg of messages) {
        await deleteRow(catalystApp, 'ChatHistory', msg.ROWID);
      }
      await deleteRow(catalystApp, 'Sessions', session.ROWID);
    }
  } catch (e) {
    console.error('[sme] Error deleting related sessions:', e.message);
  }

  await deleteRow(catalystApp, 'SMERegister', sme.ROWID);
  return { success: true, deleted: params.id };
}

// Helper: extract employee fields from a Zoho People API result row
function processResults(results, allEmployees) {
  for (const row of results) {
    // Zoho People returns { "<Zoho_ID>": [ { field data } ] } OR just { field data }
    let emp = row;
    const keys = Object.keys(row);
    if (keys.length === 1 && /^\d+$/.test(keys[0])) {
      const val = row[keys[0]];
      emp = Array.isArray(val) ? val[0] : (typeof val === 'object' ? val : row);
    }
    if (!emp) continue;

    const firstName = emp.FirstName || emp['First Name'] || emp.firstName || '';
    const lastName = emp.LastName || emp['Last Name'] || emp.lastName || '';
    const status = emp.Employeestatus || emp['Employee Status'] || emp.employeeStatus || '';
    allEmployees.push({
      employee_id: emp.EmployeeID || emp['Employee ID'] || emp.Employeeid || emp['Zoho_ID'] || '',
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim() || emp.FullName || emp['Full Name'] || '',
      email: emp.EmailID || emp['Email ID'] || emp['Email address'] || emp.Work_Email || emp.emailID || '',
      designation: emp.Designation || emp['Job Title'] || emp.JobTitle || emp.designation || '',
      department: emp.Department || emp.department || '',
      location: emp.LocationName || emp.Location || emp.Work_location || emp['Work Location'] || '',
      employee_status: status
    });
  }
}

// GET /sme/zoho-people — Fetch employees from Zoho People filtered by approved roles

async function fetchZohoPeople(catalystApp, params, body, user, queryParams) {
  let accessToken;
  const debug = queryParams && queryParams.debug === 'true';

  try {
    const creds = await catalystApp.connections().getConnectionCredentials('peopleconn');
    console.log('[sme] Connection credentials keys:', JSON.stringify({
      hasHeaders: !!creds.headers,
      headerKeys: creds.headers ? Object.keys(creds.headers) : [],
      hasParameters: !!creds.parameters,
      parameterKeys: creds.parameters ? Object.keys(creds.parameters) : [],
      credKeys: Object.keys(creds)
    }));

    // Try multiple ways to extract the access token
    const authHeader = creds.headers && (creds.headers['Authorization'] || creds.headers['authorization']);
    if (authHeader) {
      accessToken = authHeader.replace(/^Zoho-oauthtoken\s+/i, '').replace(/^Bearer\s+/i, '');
    }
    if (!accessToken && creds.parameters) {
      accessToken = creds.parameters['access_token'] || creds.parameters['accessToken'];
    }
    // Some connectors return token directly on the creds object
    if (!accessToken) {
      accessToken = creds.access_token || creds.accessToken || creds.token;
    }
    if (!accessToken) {
      throw new Error('No access token found. Credential structure: ' + JSON.stringify(Object.keys(creds)));
    }
    console.log('[sme] Access token obtained, length:', accessToken.length);
  } catch (err) {
    console.error('[sme] Zoho People connector error:', err.message);
    const e = new Error('Zoho People connection failed: ' + err.message);
    e.status = 503;
    throw e;
  }

  // Fetch employees from Zoho People API (.com.au for AU datacenter)
  const https = require('https');
  const fetchPage = (url) => new Promise((resolve, reject) => {
    console.log('[sme] Fetching:', url);
    const req = https.get(url, {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        console.log('[sme] API response status:', res.statusCode, 'body length:', body.length);
        try { resolve({ statusCode: res.statusCode, parsed: JSON.parse(body), raw: body }); }
        catch { resolve({ statusCode: res.statusCode, parsed: null, raw: body }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Zoho People API timeout')); });
  });

  // First, try fetching without the status filter to see if the API works at all
  const baseUrl = 'https://people.zoho.com.au/people/api/forms/employee/getRecords';
  const firstPage = await fetchPage(`${baseUrl}?sIndex=1&limit=5`);

  // If debug mode, return raw response for diagnosis
  if (debug) {
    return {
      debug: true,
      api_status_code: firstPage.statusCode,
      raw_response_preview: (firstPage.raw || '').slice(0, 2000),
      parsed_keys: firstPage.parsed ? Object.keys(firstPage.parsed) : null,
      response_keys: firstPage.parsed?.response ? Object.keys(firstPage.parsed.response) : null,
      result_type: firstPage.parsed?.response?.result ? (Array.isArray(firstPage.parsed.response.result) ? 'array' : typeof firstPage.parsed.response.result) : null,
      result_count: Array.isArray(firstPage.parsed?.response?.result) ? firstPage.parsed.response.result.length : null,
      first_record: firstPage.parsed?.response?.result?.[0] ? JSON.stringify(firstPage.parsed.response.result[0]).slice(0, 1000) : null,
      message: firstPage.parsed?.response?.message || null,
      status: firstPage.parsed?.response?.status
    };
  }

  // Log first page structure
  console.log('[sme] First page response keys:', firstPage.parsed ? Object.keys(firstPage.parsed) : 'parse failed');
  if (firstPage.parsed?.response) {
    console.log('[sme] response.status:', firstPage.parsed.response.status, 'response.message:', firstPage.parsed.response.message);
  }

  // Now fetch all pages (with status filter if the API supports it)
  const allEmployees = [];
  for (let page = 1; page <= 3; page++) {
    const sIndex = (page - 1) * 200 + 1;
    const data = await fetchPage(`${baseUrl}?sIndex=${sIndex}&limit=200&searchColumn=Employeestatus&searchValue=Active`);

    if (!data.parsed) {
      console.error('[sme] Failed to parse page', page, 'raw:', (data.raw || '').slice(0, 300));
      break;
    }

    const results = data.parsed.response?.result || data.parsed.result || [];
    if (!Array.isArray(results) || results.length === 0) {
      console.log('[sme] No results on page', page, '- stopping. Response:', JSON.stringify(data.parsed).slice(0, 300));

      // If page 1 with filter returned nothing, retry without filter
      if (page === 1) {
        console.log('[sme] Retrying page 1 without status filter...');
        const retryData = await fetchPage(`${baseUrl}?sIndex=1&limit=200`);
        const retryResults = retryData.parsed?.response?.result || retryData.parsed?.result || [];
        if (Array.isArray(retryResults) && retryResults.length > 0) {
          console.log('[sme] Got', retryResults.length, 'results without filter. Status filter may not be supported.');
          // Process these results and continue without filter
          processResults(retryResults, allEmployees);
          if (retryResults.length >= 200) {
            // Fetch remaining pages without filter
            for (let p = 2; p <= 3; p++) {
              const pData = await fetchPage(`${baseUrl}?sIndex=${(p - 1) * 200 + 1}&limit=200`);
              const pResults = pData.parsed?.response?.result || pData.parsed?.result || [];
              if (!Array.isArray(pResults) || pResults.length === 0) break;
              processResults(pResults, allEmployees);
              if (pResults.length < 200) break;
            }
          }
        }
      }
      break;
    }

    // Log first record structure
    if (page === 1 && results.length > 0) {
      console.log('[sme] Sample record:', JSON.stringify(results[0]).slice(0, 800));
    }

    processResults(results, allEmployees);
    if (results.length < 200) break;
  }

  console.log('[sme] Total employees fetched:', allEmployees.length);
  if (allEmployees.length > 0) {
    console.log('[sme] Sample parsed employee:', JSON.stringify(allEmployees[0]));
  }

  // Client-side filter: only keep active employees (safety net if API filter didn't work)
  const activeEmployees = allEmployees.filter(emp => {
    const status = (emp.employee_status || '').toLowerCase();
    // If no status field, include the employee (API filter should have handled it)
    return !status || status === 'active';
  });
  console.log('[sme] Active employees:', activeEmployees.length, 'of', allEmployees.length);

  // Helper: check if a designation matches a role (handles slash-separated aliases like "Marketing / Digital Marketing")
  function roleMatches(desig, role) {
    const d = desig.toLowerCase();
    const parts = role.toLowerCase().split(/\s*\/\s*/);
    return parts.some(p => d === p || d.includes(p) || p.includes(d));
  }

  // Determine journey type from query params and get approved roles
  const journeyType = (queryParams && queryParams.journey_type) || 'guest';
  const APPROVED_ROLES = getApprovedRoles(journeyType);

  // Filter to approved roles (case-insensitive partial match, handles slash-separated role aliases)
  const matched = activeEmployees.filter(emp => {
    const desig = (emp.designation || '').toLowerCase();
    return APPROVED_ROLES.some(role => roleMatches(desig, role));
  });

  // Match each employee to the closest approved role
  for (const emp of matched) {
    emp.matched_role = APPROVED_ROLES.find(role => roleMatches(emp.designation || '', role)) || emp.designation;
  }

  // Check which employees are already registered as SMEs
  const existingSmes = await query(catalystApp, 'SELECT full_name, contact_json FROM SMERegister');
  const existingEmails = new Set();
  const existingNames = new Set();
  for (const s of existingSmes) {
    existingNames.add((s.full_name || '').toLowerCase());
    const contact = safeParse(s.contact_json, {});
    if (contact.email) existingEmails.add(contact.email.toLowerCase());
  }

  for (const emp of matched) {
    emp.already_registered = existingEmails.has((emp.email || '').toLowerCase()) ||
      existingNames.has((emp.full_name || '').toLowerCase());
  }

  return {
    total_employees: allEmployees.length,
    active_employees: activeEmployees.length,
    matched_count: matched.length,
    journey_type: journeyType,
    approved_roles: APPROVED_ROLES,
    employees: matched,
    // Include sample of all designations for debugging role matching
    all_designations: [...new Set(activeEmployees.map(e => e.designation).filter(Boolean))].slice(0, 50)
  };
}

module.exports = { create, list, get, update: update_sme, validate: validate_sme, sendLink, bulkSendLinks, remove, fetchZohoPeople };
