'use strict';

const jwt = require('jsonwebtoken');

const config = require('../config');

const TOKEN_SUBJECT = 'mynotes-owner';

function signSessionToken() {
  if (!config.jwt.secret) {
    throw new Error('JWT secret is not configured');
  }

  return jwt.sign(
    { typ: 'session' },
    config.jwt.secret,
    {
      subject: TOKEN_SUBJECT,
      expiresIn: `${config.jwt.expiresInHours}h`,
    }
  );
}

function verifySessionToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    subject: TOKEN_SUBJECT,
  });
}

module.exports = {
  signSessionToken,
  verifySessionToken,
};
