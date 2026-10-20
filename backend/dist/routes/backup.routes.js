"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backup_controller_1 = require("../controllers/backup.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// ─── Excel Database Backup Routes ─────────────────────────────
router.get('/excel/download', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN', 'PIMPINAN'), backup_controller_1.downloadExcelBackup);
router.post('/excel/create', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), backup_controller_1.createExcelBackup);
router.get('/excel/list', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN', 'PIMPINAN'), backup_controller_1.getExcelBackups);
router.post('/excel/open-folder', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), backup_controller_1.openBackupFolder);
// ─── Standard Database Backup Routes ──────────────────────────
router.get('/', (0, auth_middleware_1.authorize)('ADMIN'), backup_controller_1.getBackups);
router.post('/create', (0, auth_middleware_1.authorize)('ADMIN'), backup_controller_1.createBackup);
router.get('/download/:filename', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), backup_controller_1.downloadBackup);
// ─── Audit Logs ───────────────────────────────────────────────
router.get('/audit-logs', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), backup_controller_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=backup.routes.js.map