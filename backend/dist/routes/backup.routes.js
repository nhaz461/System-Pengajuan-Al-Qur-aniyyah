"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backup_controller_1 = require("../controllers/backup.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('ADMIN'));
// Backup routes
router.get('/', backup_controller_1.getBackups);
router.post('/create', backup_controller_1.createBackup);
router.get('/download/:filename', backup_controller_1.downloadBackup);
// Audit logs
router.get('/audit-logs', backup_controller_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=backup.routes.js.map