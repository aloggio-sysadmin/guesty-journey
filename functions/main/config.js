'use strict';

/**
 * Fallback configuration.
 * getConfig() tries Catalyst Segments first, falls back to these values.
 * Replace placeholder values before deployment.
 */
const fallback = {
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production-segments',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@company.com',
  PROJECT_ID: process.env.PROJECT_ID || 'JOURNEY-MAP-001'
};

async function getConfig(catalystApp) {
  try {
    const segment = catalystApp.cache().segment();
    const [apiKey, model, jwtSecret, jwtExpiry, adminEmail, projectId] = await Promise.all([
      segment.getValue('CLAUDE_API_KEY').catch(() => null),
      segment.getValue('CLAUDE_MODEL').catch(() => null),
      segment.getValue('JWT_SECRET').catch(() => null),
      segment.getValue('JWT_EXPIRY').catch(() => null),
      segment.getValue('DEFAULT_ADMIN_EMAIL').catch(() => null),
      segment.getValue('PROJECT_ID').catch(() => null)
    ]);
    return {
      CLAUDE_API_KEY: apiKey || fallback.CLAUDE_API_KEY,
      CLAUDE_MODEL: model || fallback.CLAUDE_MODEL,
      JWT_SECRET: jwtSecret || fallback.JWT_SECRET,
      JWT_EXPIRY: jwtExpiry || fallback.JWT_EXPIRY,
      DEFAULT_ADMIN_EMAIL: adminEmail || fallback.DEFAULT_ADMIN_EMAIL,
      PROJECT_ID: projectId || fallback.PROJECT_ID
    };
  } catch (e) {
    console.warn('[config] Segments unavailable, using fallback config:', e.message);
    return { ...fallback };
  }
}

module.exports = { ...fallback, getConfig };
