'use strict';

/**
 * Vercel Serverless Function — entrypoint for every /api/* request.
 *
 * vercel.json rewrites all /api/:path* into /api so this single function
 * fronts the entire Express app. We cache the warm app instance per
 * container so cold starts only pay the schema-init cost once.
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
