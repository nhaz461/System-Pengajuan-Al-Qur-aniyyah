"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBackupFolder = exports.getExcelBackups = exports.createExcelBackup = exports.downloadExcelBackup = exports.getAuditLogs = exports.downloadBackup = exports.createBackup = exports.getBackups = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const error_middleware_1 = require("../middleware/error.middleware");
const getDbPath = () => {
    return path_1.default.resolve(__dirname, '../../../database/alquraniyyah.db');
};
const getBackupDir = () => {
    const dir = path_1.default.resolve(__dirname, '../../../backups');
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    return dir;
};
// GET /api/backups (Daftar File Backup Database)
exports.getBackups = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const backupDir = getBackupDir();
    const files = fs_1.default.readdirSync(backupDir);
    const backups = files
        .filter((f) => f.endsWith('.db') || f.endsWith('.sqlite'))
        .map((file) => {
        const fullPath = path_1.default.join(backupDir, file);
        const stat = fs_1.default.statSync(fullPath);
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
exports.createBackup = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const dbPath = getDbPath();
    const backupDir = getBackupDir();
    if (!fs_1.default.existsSync(dbPath)) {
        throw (0, error_middleware_1.createError)('File database SQLite tidak ditemukan.', 404);
    }
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const backupFilename = `backup_alquraniyyah_${timestamp}.db`;
    const targetPath = path_1.default.join(backupDir, backupFilename);
    fs_1.default.copyFileSync(dbPath, targetPath);
    const stat = fs_1.default.statSync(targetPath);
    // Catat AuditLog
    await prisma_1.default.auditLog.create({
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
exports.downloadBackup = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { filename } = req.params;
    const backupDir = getBackupDir();
    const filePath = path_1.default.join(backupDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        throw (0, error_middleware_1.createError)('File backup tidak ditemukan.', 404);
    }
    res.download(filePath, filename);
});
// GET /api/audit-logs (Riwayat Audit Trail Lengkap)
exports.getAuditLogs = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = '1', limit = '50' } = req.query;
    const p = Math.max(1, parseInt(String(page)));
    const l = Math.min(200, Math.max(1, parseInt(String(limit))));
    const skip = (p - 1) * l;
    const [logs, total] = await Promise.all([
        prisma_1.default.auditLog.findMany({
            skip,
            take: l,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
            },
        }),
        prisma_1.default.auditLog.count(),
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
const child_process_1 = require("child_process");
const excel_backup_service_1 = require("../services/excel-backup.service");
// GET /api/backups/excel/download (Unduh Langsung File Backup Excel)
exports.downloadExcelBackup = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const wb = await (0, excel_backup_service_1.buildFullDatabaseWorkbook)();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const filename = `DATABASE_KEUANGAN_ALQURANIYYAH_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
    // Juga trigger simpan ke folder lokal komputer di latar belakang
    (0, excel_backup_service_1.saveLocalExcelBackup)().catch(console.error);
});
// POST /api/backups/excel/create (Simpan Backup Excel ke Folder Lokal)
exports.createExcelBackup = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const result = await (0, excel_backup_service_1.saveLocalExcelBackup)();
    await prisma_1.default.auditLog.create({
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
exports.getExcelBackups = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const dirs = (0, excel_backup_service_1.getLocalBackupDirs)();
    const filesList = [];
    for (const dir of dirs) {
        if (fs_1.default.existsSync(dir)) {
            // 1. Cek file master terbaru
            const masterPath = path_1.default.join(dir, 'DATABASE_KEUANGAN_LOKAL_TERBARU.xlsx');
            if (fs_1.default.existsSync(masterPath)) {
                const stat = fs_1.default.statSync(masterPath);
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
            const histDir = path_1.default.join(dir, 'riwayat');
            if (fs_1.default.existsSync(histDir)) {
                const hFiles = fs_1.default.readdirSync(histDir).filter((f) => f.endsWith('.xlsx'));
                for (const hf of hFiles) {
                    const hPath = path_1.default.join(histDir, hf);
                    const stat = fs_1.default.statSync(hPath);
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
exports.openBackupFolder = (0, error_middleware_1.asyncHandler)(async (_req, res) => {
    const dirs = (0, excel_backup_service_1.getLocalBackupDirs)();
    const targetDir = dirs[0] || 'D:/Sistem_Keuangan_Portable/backups';
    if (!fs_1.default.existsSync(targetDir)) {
        fs_1.default.mkdirSync(targetDir, { recursive: true });
    }
    // Buka folder di Windows Explorer
    (0, child_process_1.exec)(`explorer.exe "${targetDir.replace(/\//g, '\\')}"`);
    res.json({
        success: true,
        message: `Folder backup dibuka di Windows Explorer: ${targetDir}`,
        data: { path: targetDir },
    });
});
//# sourceMappingURL=backup.controller.js.map