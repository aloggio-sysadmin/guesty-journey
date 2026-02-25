'use strict';

const jwt = require('jsonwebtoken');
const { getConfig } = require('../config');

/**
 * Verifies the JWT from the x-auth-token header.
 * Returns the decoded user payload: { user_id, email, role }
 * Throws a 401 error if missing/invalid/expired.
 */
async function authMiddleware(catalystApp, token) {
  if (!token) {
    const err = new Error('No authorization token provided');
    err.status = 401;
    throw err;
  }
  const config = await getConfig(catalystApp);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return { user_id: decoded.user_id, email: decoded.email, role: decoded.role };
  } catch (e) {
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }
}

/**
 * Throws a 403 error if the user is not an admin.
 */
function requireAdmin(user) {
  if (!user || user.role !== 'admin') {
    const err = new Error('Admin access required');
    err.status = 403;
    throw err;
  }
}

module.exports = { authMiddleware, requireAdmin };
