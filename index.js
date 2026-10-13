// Entrypoint for Root Vercel Function
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

const appModule = require('./backend/dist/bundle.js');
const app = appModule.default || appModule;

module.exports = app;
