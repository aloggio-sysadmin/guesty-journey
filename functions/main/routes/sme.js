'use strict';

const jwt = require('jsonwebtoken');
const { query, insert, update, deleteRow, getByField, getAllByField } = require('../utils/data-store');
const { generateId } = require('../utils/id-generator');
const { safeParse, safeStringify } = require('../utils/json-helpers');
const { validate, smeCreateSchema, smeUpdateSchema } = require('../utils/validators');
const { getConfig } = require('../config');

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

// GET /sme/zoho-people — Fetch employees from Zoho People filtered by approved roles
const APPROVED_ROLES = [
  'Regional General Manager',
  'Holiday / Hotel / Park Manager',
  'Assistant Holiday Manager, Hotel Operations',
  'Client Services',
  'Host / Inspector',
  'Reservations & Guest Services',
  'Call Centre Manager',
  'Trust',
  'Marketing / Digital Marketing',
  'Regulatory & Compliance'
];

async function fetchZohoPeople(catalystApp) {
  let accessToken;
  try {
    const connector = catalystApp.connection();
    const connectorDetails = await connector.getConnector('peopleconn');
    accessToken = connectorDetails.access_token;
  } catch (err) {
    console.error('[sme] Zoho People connector error:', err.message);
    const e = new Error('Zoho People connector not configured. Set up the "peopleconn" connector in Catalyst console.');
    e.status = 503;
    throw e;
  }

  // Fetch employees from Zoho People API (.com.au for AU datacenter)
  const https = require('https');
  const fetchPage = (index) => new Promise((resolve, reject) => {
    const url = `https://people.zoho.com.au/people/api/forms/employee/getRecords?sIndex=${index}&limit=200`;
    const req = https.get(url, {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ response: { result: [] } }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Zoho People API timeout')); });
  });

  // Fetch up to 3 pages (600 employees max)
  const allEmployees = [];
  for (let page = 1; page <= 3; page++) {
    const data = await fetchPage(page);
    const results = data.response?.result || [];
    if (!Array.isArray(results) || results.length === 0) break;
    for (const row of results) {
      const emp = typeof row === 'object' ? (row[Object.keys(row)[0]] || row) : row;
      allEmployees.push({
        employee_id: emp.EmployeeID || emp.Employeeid || '',
        first_name: emp.FirstName || emp['First Name'] || '',
        last_name: emp.LastName || emp['Last Name'] || '',
        full_name: `${emp.FirstName || emp['First Name'] || ''} ${emp.LastName || emp['Last Name'] || ''}`.trim(),
        email: emp.EmailID || emp['Email ID'] || emp.Work_Email || '',
        designation: emp.Designation || emp.JobTitle || emp['Job Title'] || '',
        department: emp.Department || '',
        location: emp.Location || emp.Work_Location || ''
      });
    }
    if (results.length < 200) break;
  }

  // Filter to approved roles (case-insensitive partial match)
  const matched = allEmployees.filter(emp => {
    const desig = (emp.designation || '').toLowerCase();
    return APPROVED_ROLES.some(role => {
      const roleLower = role.toLowerCase();
      return desig === roleLower ||
        desig.includes(roleLower) ||
        roleLower.includes(desig);
    });
  });

  // Match each employee to the closest approved role
  for (const emp of matched) {
    const desig = (emp.designation || '').toLowerCase();
    emp.matched_role = APPROVED_ROLES.find(role => {
      const r = role.toLowerCase();
      return desig === r || desig.includes(r) || r.includes(desig);
    }) || emp.designation;
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
    matched_count: matched.length,
    approved_roles: APPROVED_ROLES,
    employees: matched
  };
}

module.exports = { create, list, get, update: update_sme, validate: validate_sme, sendLink, remove, fetchZohoPeople };
