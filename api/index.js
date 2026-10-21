// Entrypoint for Vercel Serverless Function (/api/*)
process.env.VERCEL = '1';
const path = require('path');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.qowylddgvipghksxwxgv:Janganlupa461@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = 'postgresql://postgres.qowylddgvipghksxwxgv:Janganlupa461@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';
}

const appModule = require('../backend/dist/index.js');
const app = appModule.default || appModule;

module.exports = app;
