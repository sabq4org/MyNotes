'use strict';

const express = require('express');
const bcrypt = require('bcrypt');

const config = require('../config');
const { getSetting, setSetting } = require('../db/database');
const { signSessionToken } = require('../auth/tokens');
const requireAuth = require('../middleware/requireAuth');
const throttle = require('../auth/loginThrottle');

const router = express.Router();

const PIN_KEY = 'master_pin_hash';
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 128;

async function isPinSet() {
  return Boolean(await getSetting(PIN_KEY));
}

function validatePin(pin) {
  if (typeof pin !== 'string') {
    return 'PIN must be a string.';
  }
  const trimmed = pin.trim();
  if (trimmed.length < MIN_PIN_LENGTH) {
    return `PIN must be at least ${MIN_PIN_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_PIN_LENGTH) {
    return `PIN must be at most ${MAX_PIN_LENGTH} characters.`;
  }
  return null;
}

router.get('/status', async (req, res, next) => {
  try {
    res.json({ isSetup: await isPinSet() });
  } catch (err) {
    next(err);
  }
});

router.post('/setup', async (req, res, next) => {
  try {
    if (await isPinSet()) {
      return res.status(409).json({
        error: 'already_setup',
        message: 'A master PIN has already been configured.',
      });
    }

    const { pin } = req.body || {};
    const problem = validatePin(pin);
    if (problem) {
      return res.status(400).json({ error: 'invalid_pin', message: problem });
    }

    const hash = await bcrypt.hash(pin.trim(), config.bcryptCost);
    await setSetting(PIN_KEY, hash);

    const token = signSessionToken();
    return res.status(201).json({
      ok: true,
      token,
      expiresInHours: config.jwt.expiresInHours,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    if (!(await isPinSet())) {
      return res.status(409).json({
        error: 'not_setup',
        message: 'No master PIN configured yet. Call /api/auth/setup first.',
      });
    }

    if (throttle.isLocked(req)) {
      return res.status(429).json({
        error: 'too_many_attempts',
        message: 'Too many failed attempts. Please wait a few minutes.',
      });
    }

    const { pin } = req.body || {};
    if (typeof pin !== 'string' || pin.length === 0) {
      throttle.recordFailure(req);
      return res
        .status(400)
        .json({ error: 'invalid_pin', message: 'PIN is required.' });
    }

    const hash = await getSetting(PIN_KEY);
    const ok = await bcrypt.compare(pin.trim(), hash);
    if (!ok) {
      throttle.recordFailure(req);
      return res
        .status(401)
        .json({ error: 'invalid_credentials', message: 'Wrong PIN.' });
    }

    throttle.reset(req);
    const token = signSessionToken();
    return res.json({
      ok: true,
      token,
      expiresInHours: config.jwt.expiresInHours,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/change', requireAuth, async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body || {};

    if (typeof currentPin !== 'string' || currentPin.length === 0) {
      return res.status(400).json({
        error: 'invalid_pin',
        message: 'Current PIN is required.',
      });
    }

    const problem = validatePin(newPin);
    if (problem) {
      return res
        .status(400)
        .json({ error: 'invalid_pin', message: problem });
    }

    const hash = await getSetting(PIN_KEY);
    const ok = await bcrypt.compare(currentPin.trim(), hash);
    if (!ok) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Current PIN is incorrect.',
      });
    }

    const newHash = await bcrypt.hash(newPin.trim(), config.bcryptCost);
    await setSetting(PIN_KEY, newHash);

    const token = signSessionToken();
    return res.json({
      ok: true,
      token,
      expiresInHours: config.jwt.expiresInHours,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
