'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const databaseUrl = (process.env.DATABASE_URL || '').trim();
const sslRequested = /sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 4000),

  database: {
    url: databaseUrl,
    poolMax: toInt(process.env.DB_POOL_MAX, 10),
    idleTimeoutMs: toInt(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMs: toInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
    // Hosted Postgres (Neon, Supabase, etc.) presents certs that aren't in the
    // default trust store. We require TLS but skip CA verification — fine for
    // a personal app since we're still encrypted in transit.
    ssl: sslRequested ? { rejectUnauthorized: false } : false,
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresInHours: toInt(process.env.JWT_EXPIRES_IN_HOURS, 72),
  },
  bcryptCost: toInt(process.env.BCRYPT_COST, 12),
  cors: {
    /**
     * Raw value as provided by the user. May be one of:
     *   - empty / unset → defaults to localhost dev origin
     *   - "*" → allow any origin
     *   - "https://a.com,https://b.com" → allow this set
     *   - "https://only-this.com" → single origin
     */
    origin: parseCorsOrigin(process.env.CORS_ORIGIN),
  },
};

function parseCorsOrigin(raw) {
  if (raw == null || raw === '') return 'http://localhost:5173';
  const value = raw.trim();
  if (value === '*') return true;
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return 'http://localhost:5173';
  if (list.length === 1) return list[0];
  return list;
}

module.exports = config;
