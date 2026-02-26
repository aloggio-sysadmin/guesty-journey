'use strict';

const catalyst = require('zcatalyst-sdk-node');

// Route handlers (lazy-loaded)
let authRoutes, chatRoutes, smeRoutes, techRoutes, processRoutes,
    journeyRoutes, gapsRoutes, conflictsRoutes, projectRoutes, reportsRoutes;

function loadRoutes() {
  if (!authRoutes) authRoutes = require('./routes/auth');
  if (!chatRoutes) chatRoutes = require('./routes/chat');
  if (!smeRoutes) smeRoutes = require('./routes/sme');
  if (!techRoutes) techRoutes = require('./routes/tech');
  if (!processRoutes) processRoutes = require('./routes/process');
  if (!journeyRoutes) journeyRoutes = require('./routes/journey');
  if (!gapsRoutes) gapsRoutes = require('./routes/gaps');
  if (!conflictsRoutes) conflictsRoutes = require('./routes/conflicts');
  if (!projectRoutes) projectRoutes = require('./routes/project');
  if (!reportsRoutes) reportsRoutes = require('./routes/reports');
}

const { authMiddleware, requireAdmin } = require('./middleware/auth');

// Admin-only routes
const ADMIN_EXACT = [
  'POST /auth/register',
  'POST /auth/bulk-import',
  'GET /auth/users'
];

function isAdminRoute(method, path) {
  if (ADMIN_EXACT.includes(`${method} ${path}`)) return true;
  if (method === 'PUT' && path.startsWith('/auth/users/')) return true;
  if (method === 'POST' && path.match(/^\/sme\/[^/]+\/send-link$/)) return true;
  return false;
}

// Public routes (no auth required)
const PUBLIC_ROUTES = new Set(['POST /auth/login', 'GET /health', 'POST /admin/seed']);

// SME self-service routes are public (authenticated via token in body/query)
function isSmePublicRoute(method, path) {
  if (method === 'POST' && path === '/chat/sme-start') return true;
  if (path.startsWith('/chat/sme/')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Response helper — uses native Node.js ServerResponse API
// ---------------------------------------------------------------------------
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-auth-token'
  });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Body parser — reads JSON from native Node.js IncomingMessage stream
// ---------------------------------------------------------------------------
function parseBody(req) {
  return new Promise((resolve) => {
    // GET/HEAD/DELETE usually have no body
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
      return resolve({});
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
function parsePath(rawUrl) {
  const [pathWithPrefix] = rawUrl.split('?');
  // Strip Catalyst function prefix /server/main
  return pathWithPrefix.replace(/^\/server\/main/, '') || '/';
}

function parseQuery(rawUrl) {
  const idx = rawUrl.indexOf('?');
  if (idx === -1) return {};
  const result = {};
  for (const part of rawUrl.slice(idx + 1).split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      if (part) result[decodeURIComponent(part)] = '';
    } else {
      result[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Route definition table
// ---------------------------------------------------------------------------
function buildRouteTable() {
  loadRoutes();
  return [
    { method: 'GET',  pattern: '/health',                  handler: (_a,_p,_b,_u) => ({ status: 'ok', timestamp: new Date().toISOString() }) },
    // Auth
    { method: 'POST', pattern: '/auth/login',               handler: authRoutes.login },
    { method: 'POST', pattern: '/auth/register',            handler: authRoutes.register },
    { method: 'POST', pattern: '/auth/bulk-import',         handler: authRoutes.bulkImport },
    { method: 'GET',  pattern: '/auth/users',               handler: authRoutes.listUsers },
    { method: 'PUT',  pattern: '/auth/users/:id',           handler: authRoutes.updateUser },
    // Chat
    { method: 'POST', pattern: '/chat/start',               handler: chatRoutes.startSession },
    { method: 'GET',  pattern: '/chat/sessions',            handler: chatRoutes.listSessions },
    // SME self-service chat (must be before /chat/:sessionId to avoid conflicts)
    { method: 'POST', pattern: '/chat/sme-start',                  handler: chatRoutes.startSmeSession },
    { method: 'GET',  pattern: '/chat/sme/:sessionId',             handler: chatRoutes.resumeSmeSession },
    { method: 'POST', pattern: '/chat/sme/:sessionId/message',     handler: chatRoutes.sendSmeMessage },
    { method: 'POST', pattern: '/chat/sme/:sessionId/close',       handler: chatRoutes.closeSmeSession },
    // Regular chat
    { method: 'GET',  pattern: '/chat/:sessionId',          handler: chatRoutes.resumeSession },
    { method: 'POST', pattern: '/chat/:sessionId/message',  handler: chatRoutes.sendMessage },
    { method: 'POST', pattern: '/chat/:sessionId/action',   handler: chatRoutes.quickAction },
    { method: 'POST', pattern: '/chat/:sessionId/close',    handler: chatRoutes.closeSession },
    // SME
    { method: 'POST', pattern: '/sme',                      handler: smeRoutes.create },
    { method: 'GET',  pattern: '/sme',                      handler: smeRoutes.list },
    { method: 'GET',  pattern: '/sme/:id',                  handler: smeRoutes.get },
    { method: 'PUT',  pattern: '/sme/:id',                  handler: smeRoutes.update },
    { method: 'POST', pattern: '/sme/:id/validate',         handler: smeRoutes.validate },
    { method: 'POST', pattern: '/sme/:id/send-link',        handler: smeRoutes.sendLink },
    // Tech
    { method: 'POST', pattern: '/tech',                     handler: techRoutes.create },
    { method: 'GET',  pattern: '/tech',                     handler: techRoutes.list },
    { method: 'GET',  pattern: '/tech/:id',                 handler: techRoutes.get },
    { method: 'PUT',  pattern: '/tech/:id',                 handler: techRoutes.update },
    // Process
    { method: 'POST', pattern: '/process',                  handler: processRoutes.create },
    { method: 'GET',  pattern: '/process',                  handler: processRoutes.list },
    { method: 'GET',  pattern: '/process/:id',              handler: processRoutes.get },
    { method: 'PUT',  pattern: '/process/:id',              handler: processRoutes.update },
    // Journey
    { method: 'POST', pattern: '/journey',                  handler: journeyRoutes.create },
    { method: 'GET',  pattern: '/journey',                  handler: journeyRoutes.list },
    { method: 'GET',  pattern: '/journey/:id',              handler: journeyRoutes.get },
    { method: 'PUT',  pattern: '/journey/:id',              handler: journeyRoutes.update },
    // Gaps
    { method: 'POST', pattern: '/gaps',                     handler: gapsRoutes.create },
    { method: 'GET',  pattern: '/gaps',                     handler: gapsRoutes.list },
    { method: 'GET',  pattern: '/gaps/:id',                 handler: gapsRoutes.get },
    { method: 'PUT',  pattern: '/gaps/:id',                 handler: gapsRoutes.update },
    // Conflicts
    { method: 'POST', pattern: '/conflicts',                handler: conflictsRoutes.create },
    { method: 'GET',  pattern: '/conflicts',                handler: conflictsRoutes.list },
    { method: 'GET',  pattern: '/conflicts/:id',            handler: conflictsRoutes.get },
    { method: 'POST', pattern: '/conflicts/:id/resolve',    handler: conflictsRoutes.resolve },
    // Project
    { method: 'GET',  pattern: '/project/state',            handler: projectRoutes.getState },
    { method: 'POST', pattern: '/project/recalculate',      handler: projectRoutes.recalculate },
    // Reports
    { method: 'POST', pattern: '/reports/:type',            handler: reportsRoutes.generate },
    // Admin seed
    { method: 'POST', pattern: '/admin/seed',               handler: projectRoutes.seed },
  ];
}

// ---------------------------------------------------------------------------
// Pattern matcher: returns params object or null
// ---------------------------------------------------------------------------
function matchPattern(pattern, path) {
  const pp = pattern.split('/');
  const pathp = path.split('/');
  if (pp.length !== pathp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(pathp[i]);
    } else if (pp[i] !== pathp[i]) {
      return null;
    }
  }
  return params;
}

function matchRoute(method, path) {
  for (const route of buildRouteTable()) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, path);
    if (params !== null) return { handler: route.handler, params };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main entry point — native Node.js IncomingMessage / ServerResponse
// ---------------------------------------------------------------------------
module.exports = async (req, res) => {
  const app = catalyst.initialize(req);

  const method = (req.method || 'GET').toUpperCase();
  const rawUrl = req.url || '/';
  const path   = parsePath(rawUrl);
  const queryParams = parseQuery(rawUrl);
  const routeKey = `${method} ${path}`;

  // Handle OPTIONS preflight
  if (method === 'OPTIONS') {
    sendJson(res, 200, {});
    return;
  }

  try {
    const body = await parseBody(req);

    // Authentication
    let user = null;
    if (!PUBLIC_ROUTES.has(routeKey) && !isSmePublicRoute(method, path)) {
      const authToken = req.headers && req.headers['x-auth-token'];
      user = await authMiddleware(app, authToken);
    }

    // Admin gate
    if (isAdminRoute(method, path)) {
      requireAdmin(user);
    }

    // Dispatch
    const match = matchRoute(method, path);
    if (!match) {
      sendJson(res, 404, { error: `Route not found: ${method} ${path}` });
      return;
    }

    // handler(catalystApp, urlParams, body, authUser, queryParams)
    const result = await match.handler(app, match.params, body, user, queryParams);
    sendJson(res, 200, result);

  } catch (err) {
    console.error(`[ERROR] ${method} ${path}:`, err);
    const status = err.status || err.statusCode || 500;
    sendJson(res, status, { error: err.message || 'Internal server error' });
  }
};
