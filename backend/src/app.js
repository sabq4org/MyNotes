'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const requireAuth = require('./middleware/requireAuth');

const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const { projectNotesRouter, noteRouter } = require('./routes/notes');
const tagsRoutes = require('./routes/tags');
const searchRoutes = require('./routes/search');
const backupRoutes = require('./routes/backup');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: config.cors.origin, credentials: false }));
  app.use(express.json({ limit: '25mb' }));

  if (config.env !== 'test') {
    app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      env: config.env,
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/projects/:projectId/notes', projectNotesRouter);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/notes', noteRouter);
  app.use('/api/tags', tagsRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/backup', backupRoutes);

  // Sample protected probe — confirms a session JWT is accepted.
  app.get('/api/me', requireAuth, (req, res) => {
    res.json({ ok: true, session: req.session });
  });

  app.use((req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: `No route for ${req.method} ${req.originalUrl}.`,
    });
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
