'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const config = require('../config');

let pool = null;

function getPool() {
  if (pool) return pool;

  if (!config.database.url) {
    throw new Error(
      'DATABASE_URL is not configured. Set it in backend/.env to a PostgreSQL connection string.'
    );
  }

  pool = new Pool({
    connectionString: config.database.url,
    max: config.database.poolMax,
    idleTimeoutMillis: config.database.idleTimeoutMs,
    connectionTimeoutMillis: config.database.connectionTimeoutMs,
    ssl: config.database.ssl,
  });

  pool.on('error', (err) => {
    console.error('[db] unexpected pool error:', err);
  });

  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

/**
 * Run the schema (idempotent) and ensure runtime settings exist.
 */
async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await query(schemaSql);
  await ensureJwtSecret();
}

async function getSetting(key) {
  const { rows } = await query(
    'SELECT value FROM settings WHERE key = $1',
    [key]
  );
  return rows[0] ? rows[0].value : null;
}

async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = now()`,
    [key, value]
  );
}

async function deleteSetting(key) {
  await query('DELETE FROM settings WHERE key = $1', [key]);
}

/**
 * The JWT secret is preferred from the environment. If neither the env nor
 * the DB has one, we generate a strong random secret and persist it so
 * tokens stay valid across restarts.
 */
async function ensureJwtSecret() {
  if (config.jwt.secret && config.jwt.secret.trim().length >= 32) {
    return config.jwt.secret;
  }

  let secret = await getSetting('jwt_secret');
  if (!secret) {
    secret = crypto.randomBytes(48).toString('hex');
    await setSetting('jwt_secret', secret);
  }

  config.jwt.secret = secret;
  return secret;
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  initDatabase,
  getSetting,
  setSetting,
  deleteSetting,
  closeDatabase,
};
