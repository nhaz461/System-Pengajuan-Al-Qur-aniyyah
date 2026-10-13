// Entrypoint for Vercel Express Service
try {
  const appModule = require('./dist/index.js');
  module.exports = appModule.default || appModule;
} catch (error) {
  console.error('Failed to load backend dist/index.js:', error);
  const express = require('express');
  const app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Backend failed to initialize on Vercel',
      error: error.message,
      stack: error.stack,
    });
  });
  module.exports = app;
}
