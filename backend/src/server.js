'use strict';

const config = require('./config');
const { initDatabase, closeDatabase } = require('./db/database');
const createApp = require('./app');

async function start() {
  if (!config.database.url) {
    console.error(
      '[mynotes] DATABASE_URL is not set. ' +
        'Set it in your environment (Vercel: Project → Settings → Environment Variables).'
    );
    process.exit(1);
  }

  try {
    await initDatabase();
  } catch (err) {
    console.error('[mynotes] failed to initialize database:', err.message);
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(
      `[mynotes] server listening on http://localhost:${config.port} (${config.env})`
    );
    console.log('[mynotes] connected to PostgreSQL');
  });

  const shutdown = async (signal) => {
    console.log(`\n[mynotes] received ${signal}, shutting down...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
