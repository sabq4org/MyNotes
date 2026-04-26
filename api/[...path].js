'use strict';

/**
 * Vercel Serverless Function — catches every /api/* request and forwards
 * it to our Express app. Reuses one app instance per warm container so
 * cold starts only pay the schema-init cost on the very first request.
 */

const createApp = require('../backend/src/app');
const { initDatabase } = require('../backend/src/db/database');

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      try {
        await initDatabase();
        return createApp();
      } catch (err) {
        // Don't cache the failure — let the next request retry init.
        appPromise = null;
        throw err;
      }
    })();
  }
  return appPromise;
}

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('[mynotes] init failed:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'init_failed',
        message:
          err && err.message
            ? err.message
            : 'Backend failed to initialize. Check DATABASE_URL.',
      })
    );
  }
};
