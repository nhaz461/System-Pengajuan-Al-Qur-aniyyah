import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from 'dotenv';

config();

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

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    app: 'Sistem Administrasi Keuangan Yayasan Al-Qur\'aniyyah',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    phase: 'PHASE 4',
  });
});

import approvalRoutes from './routes/approval.routes';
import disbursementRoutes from './routes/disbursement.routes';
import lpjRoutes from './routes/lpj.routes';
import backupRoutes from './routes/backup.routes';

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/fiscal-years', fiscalYearRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ssh', sshRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/disbursements', disbursementRoutes);
app.use('/api/lpj', lpjRoutes);
app.use('/api/backups', backupRoutes);

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
