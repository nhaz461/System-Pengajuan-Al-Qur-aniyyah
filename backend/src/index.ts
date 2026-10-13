import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres.fnfcjpyaqzpncbnlktdq:Janganlupa461@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'AlQuraniyyah_JWT_Secret_2026_YayasanPendidikanIslam';
}

import prisma from './lib/prisma';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import unitRoutes from './routes/units.routes';
import activityRoutes from './routes/activities.routes';
import fiscalYearRoutes from './routes/fiscal-years.routes';
import userRoutes from './routes/users.routes';
import dashboardRoutes from './routes/dashboard.routes';
import sshRoutes from './routes/ssh.routes';
import submissionRoutes from './routes/submissions.routes';
import reviewRoutes from './routes/review.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// ─── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS - Izinkan akses dari LAN ────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan semua origin (localhost dan LAN)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parser ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logger ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Static Files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// ─── Health Check & Live Diagnostics ────────────────────────
app.get(['/', '/health', '/api/health', '/api/system/diagnostics'], async (_req, res) => {
  let dbStatus = 'disconnected';
  let userCount = 0;
  let dbLatencyMs = 0;
  const startTime = Date.now();

  try {
    userCount = await prisma.user.count();
    dbStatus = 'connected';
    dbLatencyMs = Date.now() - startTime;
  } catch (error: any) {
    dbStatus = 'error: ' + (error.message ? error.message.slice(0, 80) : 'connection failed');
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    app: 'Sistem Administrasi Keuangan Yayasan Al-Qur\'aniyyah',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    phase: 'PHASE 4',
    diagnostics: {
      backend: 'online',
      database: dbStatus === 'connected' ? 'connected' : 'error',
      databaseLatency: `${dbLatencyMs}ms`,
      authService: dbStatus === 'connected' ? 'ready' : 'unavailable',
      totalUsersConfigured: userCount,
      environment: process.env.NODE_ENV || 'production',
      platform: process.env.VERCEL ? 'Vercel Serverless' : 'Node.js Standalone',
      lastChecked: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    },
  });
});

import approvalRoutes from './routes/approval.routes';
import disbursementRoutes from './routes/disbursement.routes';
import lpjRoutes from './routes/lpj.routes';
import backupRoutes from './routes/backup.routes';

// ─── Routes (Dukung akses dengan atau tanpa prefix /api) ───────────
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/units', '/units'], unitRoutes);
app.use(['/api/activities', '/activities'], activityRoutes);
app.use(['/api/fiscal-years', '/fiscal-years'], fiscalYearRoutes);
app.use(['/api/users', '/users'], userRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/ssh', '/ssh'], sshRoutes);
app.use(['/api/submissions', '/submissions'], submissionRoutes);
app.use(['/api/reviews', '/reviews'], reviewRoutes);
app.use(['/api/approvals', '/approvals'], approvalRoutes);
app.use(['/api/disbursements', '/disbursements'], disbursementRoutes);
app.use(['/api/lpj', '/lpj'], lpjRoutes);
app.use(['/api/backups', '/backups'], backupRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan.',
  });
});

// ─── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server (hanya saat standalone, bukan saat di Vercel serverless) ──────────
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   Sistem Administrasi Keuangan                     ║');
    console.log('║   Yayasan Pendidikan Islam Al-Qur\'aniyyah          ║');
    console.log('║   Version 1.0.0 - Phase 4                          ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\n🚀 Server berjalan:`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   LAN:      http://<IP-SERVER>:${PORT}`);
    console.log(`   API:      http://localhost:${PORT}/api`);
    console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
  });
}

export default app;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
}
