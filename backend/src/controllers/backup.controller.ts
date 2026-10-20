import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, createError } from '../middleware/error.middleware';

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

// ══════════════════════════════════════════════════════════════════
// EXCEL DATABASE BACKUP CONTROLLERS (MENGHIMPUN SELURUH DATA LOKAL)
// ══════════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import {
  buildFullDatabaseWorkbook,
  saveLocalExcelBackup,
  getLocalBackupDirs,
} from '../services/excel-backup.service';

// GET /api/backups/excel/download (Unduh Langsung File Backup Excel)
export const downloadExcelBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wb = await buildFullDatabaseWorkbook();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const filename = `DATABASE_KEUANGAN_ALQURANIYYAH_${dateStr}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  await wb.xlsx.write(res);
  res.end();

  // Juga trigger simpan ke folder lokal komputer di latar belakang
  saveLocalExcelBackup().catch(console.error);
});

// POST /api/backups/excel/create (Simpan Backup Excel ke Folder Lokal)
export const createExcelBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await saveLocalExcelBackup();

  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      action: 'DATABASE_BACKUP_EXCEL',
      entity: 'System',
      note: `Backup Excel lokal dibuat: ${result.filename} (${result.sizeFormatted})`,
    },
  });

  res.json({
    success: true,
    message: 'Backup database Excel berhasil disimpan ke penyimpanan lokal.',
    data: result,
  });
});

// GET /api/backups/excel/list (Daftar File Backup Excel Lokal)
export const getExcelBackups = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const dirs = getLocalBackupDirs();
  const filesList: Array<{
    filename: string;
    path: string;
    sizeBytes: number;
    sizeFormatted: string;
    createdAt: Date;
    isLatest: boolean;
  }> = [];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      // 1. Cek file master terbaru
      const masterPath = path.join(dir, 'DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx');
      if (fs.existsSync(masterPath)) {
        const stat = fs.statSync(masterPath);
        if (!filesList.some((f) => f.filename === 'DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx')) {
          filesList.push({
            filename: 'DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx',
            path: masterPath,
            sizeBytes: stat.size,
            sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
            createdAt: stat.mtime,
            isLatest: true,
          });
        }
      }

      // 2. Cek folder riwayat
      const histDir = path.join(dir, 'riwayat');
      if (fs.existsSync(histDir)) {
        const hFiles = fs.readdirSync(histDir).filter((f) => f.endsWith('.xlsx'));
        for (const hf of hFiles) {
          const hPath = path.join(histDir, hf);
          const stat = fs.statSync(hPath);
          if (!filesList.some((f) => f.filename === hf)) {
            filesList.push({
              filename: hf,
              path: hPath,
              sizeBytes: stat.size,
              sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
              createdAt: stat.mtime,
              isLatest: false,
            });
          }
        }
      }
    }
  }

  filesList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    data: filesList,
  });
});

// POST /api/backups/excel/open-folder (Buka Folder Backup di Windows Explorer)
export const openBackupFolder = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const dirs = getLocalBackupDirs();
  const targetDir = dirs[0] || 'D:/Sistem_Keuangan_Portable/backups';

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Buka folder di Windows Explorer
  exec(`explorer.exe "${targetDir.replace(/\//g, '\\')}"`);

  res.json({
    success: true,
    message: `Folder backup dibuka di Windows Explorer: ${targetDir}`,
    data: { path: targetDir },
  });
});

