// Entrypoint for Vercel Serverless Function (/api/*)
const path = require('path');

// Ensure fallback database and auth configuration
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.fnfcjpyaqzpncbnlktdq:Janganlupa461@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';
}

let app;
try {
  const appModule = require('../backend/dist/index.js');
  app = appModule.default || appModule;
} catch (loadErr) {
  console.error('[Vercel Serverless api/index.js] Error loading backend/dist/index.js:', loadErr);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Gagal menginisialisasi backend serverless pada /api',
      error: loadErr.message,
    });
  });
}

module.exports = app;
