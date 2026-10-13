// Entrypoint for Root Vercel Serverless Function
const path = require('path');

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
  const appModule = require('./backend/dist/index.js');
  app = appModule.default || appModule;
} catch (loadErr) {
  console.error('[Root index.js] Error loading backend/dist/index.js:', loadErr);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      success: false,
      message: 'Gagal menginisialisasi backend serverless pada root',
      error: loadErr.message,
    });
  });
}

module.exports = app;
