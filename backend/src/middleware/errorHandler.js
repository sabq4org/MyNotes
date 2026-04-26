'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error('[error]', err);
  }

  res.status(status).json({
    error: err.code || (isServerError ? 'internal_error' : 'request_error'),
    message: isServerError
      ? 'Something went wrong on the server.'
      : err.message || 'Request failed.',
  });
}

module.exports = errorHandler;
