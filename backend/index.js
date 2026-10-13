// Entrypoint for backend service on Vercel
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
let initError = null;

try {
  const appModule = require('./dist/bundle.js');
  app = appModule.default || appModule;
} catch (err) {
  initError = err;
  console.error('[backend/index.js] Init error:', err);
}

module.exports = (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      message: 'Backend initialization error on Vercel',
      error: initError.message,
      stack: initError.stack,
    }, null, 2));
    return;
  }

  return app(req, res);
};
