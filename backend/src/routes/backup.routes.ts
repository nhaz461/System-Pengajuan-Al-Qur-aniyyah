import { Router } from 'express';
import {
  getBackups,
  createBackup,
  downloadBackup,
  getAuditLogs,
} from '../controllers/backup.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// Backup routes
router.get('/', getBackups);
router.post('/create', createBackup);
router.get('/download/:filename', downloadBackup);

// Audit logs
router.get('/audit-logs', getAuditLogs);

export default router;
