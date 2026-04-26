'use strict';

const { verifySessionToken } = require('../auth/tokens');

const BEARER_PREFIX = 'Bearer ';

/**
 * Express middleware that allows the request through only when a valid
 * session JWT is present in the `Authorization` header.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith(BEARER_PREFIX)) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing bearer token.',
    });
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Empty bearer token.',
    });
  }

  try {
    const payload = verifySessionToken(token);
    req.session = payload;
    return next();
  } catch (err) {
    const isExpired = err && err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: isExpired ? 'token_expired' : 'invalid_token',
      message: isExpired
        ? 'Session has expired, please log in again.'
        : 'Invalid session token.',
    });
  }
}

module.exports = requireAuth;
