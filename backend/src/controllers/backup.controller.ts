import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, createError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

const getDbPath = () => {
  return path.resolve(__dirname, '../../../database/alquraniyyah.db');
};

const getBackupDir = () => {
  const dir = path.resolve(__dirname, '../../../backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// GET /api/backups (Daftar File Backup Database)
export const getBackups = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const backupDir = getBackupDir();
  const files = fs.readdirSync(backupDir);

  const backups = files
    .filter((f) => f.endsWith('.db') || f.endsWith('.sqlite'))
    .map((file) => {
      const fullPath = path.join(backupDir, file);
      const stat = fs.statSync(fullPath);
      return {
        filename: file,
        sizeBytes: stat.size,
        sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
        createdAt: stat.birthtime || stat.mtime,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    data: backups,
  });
});

// POST /api/backups/create (Buat Backup Baru)
export const createBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dbPath = getDbPath();
  const backupDir = getBackupDir();

  if (!fs.existsSync(dbPath)) {
    throw createError('File database SQLite tidak ditemukan.', 404);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backupFilename = `backup_alquraniyyah_${timestamp}.db`;
  const targetPath = path.join(backupDir, backupFilename);

  fs.copyFileSync(dbPath, targetPath);
  const stat = fs.statSync(targetPath);

  // Catat AuditLog
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'DATABASE_BACKUP',
      entity: 'System',
      note: `Backup database dibuat: ${backupFilename} (${(stat.size / 1024).toFixed(1)} KB)`,
    },
  });

  res.json({
    success: true,
    message: `Backup database '${backupFilename}' berhasil dibuat.`,
    data: {
      filename: backupFilename,
      sizeBytes: stat.size,
      sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
      createdAt: new Date(),
    },
  });
});

// GET /api/backups/download/:filename (Download File Backup)
export const downloadBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filename } = req.params;
  const backupDir = getBackupDir();
  const filePath = path.join(backupDir, filename);

  if (!fs.existsSync(filePath)) {
    throw createError('File backup tidak ditemukan.', 404);
  }

  res.download(filePath, filename);
});

// GET /api/audit-logs (Riwayat Audit Trail Lengkap)
export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '50' } = req.query;
  const p = Math.max(1, parseInt(String(page)));
  const l = Math.min(200, Math.max(1, parseInt(String(limit))));
  const skip = (p - 1) * l;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
      },
    }),
    prisma.auditLog.count(),
  ]);

  res.json({
    success: true,
    data: {
      items: logs,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    },
  });
});
