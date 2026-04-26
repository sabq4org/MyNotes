'use strict';

/**
 * Tiny in-memory throttle for login attempts. Since MyNotes is single-user we
 * track attempts globally (per server process), keyed by client IP. Sliding
 * window: too many failures → 401 with a short cooldown.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

const attempts = new Map();

function getKey(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function getRecord(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.firstAt > WINDOW_MS) {
    const fresh = { count: 0, firstAt: now };
    attempts.set(key, fresh);
    return fresh;
  }
  return record;
}

function isLocked(req) {
  const record = getRecord(getKey(req));
  return record.count >= MAX_FAILS;
}

function recordFailure(req) {
  const record = getRecord(getKey(req));
  record.count += 1;
}

function reset(req) {
  attempts.delete(getKey(req));
}

module.exports = {
  isLocked,
  recordFailure,
  reset,
  MAX_FAILS,
  WINDOW_MS,
};
