import { Router } from 'express';
import {
  getBackups,
  createBackup,
  downloadBackup,
  getAuditLogs,
  downloadExcelBackup,
  createExcelBackup,
  getExcelBackups,
  openBackupFolder,
} from '../controllers/backup.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// ─── Excel Database Backup Routes ─────────────────────────────
router.get('/excel/download', authorize('ADMIN', 'KEUANGAN', 'PIMPINAN'), downloadExcelBackup);
router.post('/excel/create', authorize('ADMIN', 'KEUANGAN'), createExcelBackup);
router.get('/excel/list', authorize('ADMIN', 'KEUANGAN', 'PIMPINAN'), getExcelBackups);
router.post('/excel/open-folder', authorize('ADMIN', 'KEUANGAN'), openBackupFolder);

// ─── Standard Database Backup Routes ──────────────────────────
router.get('/', authorize('ADMIN'), getBackups);
router.post('/create', authorize('ADMIN'), createBackup);
router.get('/download/:filename', authorize('ADMIN', 'KEUANGAN'), downloadBackup);

// ─── Audit Logs ───────────────────────────────────────────────
router.get('/audit-logs', authorize('ADMIN', 'KEUANGAN'), getAuditLogs);

export default router;
