"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ssh_controller_1 = require("../controllers/ssh.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// Download template resmi Master SSH (dapat diakses sebelum auth atau oleh browser langsung)
router.get('/template/download', ssh_controller_1.downloadSshTemplate);
router.use(auth_middleware_1.authenticate);
// Status Master SSH (dapat dilihat oleh semua yang login)
router.get('/status', ssh_controller_1.getActiveSshStatus);
// Query items dari database (dapat dilihat oleh semua role)
router.get('/items', ssh_controller_1.getSshItems);
// Tambah Item SSH Baru (Admin & Keuangan)
router.post('/items', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.createSshItem);
// Edit Item SSH (Admin & Keuangan)
router.put('/items/:id', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.updateSshItem);
router.patch('/items/:id', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.updateSshItem);
// Hapus Item SSH (Admin & Keuangan)
router.delete('/items/:id', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.deleteSshItem);
// Preview Excel SSH (Admin & Keuangan)
router.post('/preview', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), upload_middleware_1.uploadExcel.single('file'), ssh_controller_1.previewSsh);
// Konfirmasi Simpan ke Database (Admin & Keuangan)
router.post('/import', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.confirmImportSsh);
// Histori Versi SSH (Admin & Keuangan)
router.get('/versions', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.getSshVersions);
// Set Versi Aktif (Admin only)
router.patch('/versions/:id/set-active', (0, auth_middleware_1.authorize)('ADMIN'), ssh_controller_1.setActiveSshVersion);
// Hapus Versi Nonaktif (Admin only)
router.delete('/versions/:id', (0, auth_middleware_1.authorize)('ADMIN'), ssh_controller_1.deleteSshVersion);
// Kosongkan seluruh database Master SSH (Admin & Keuangan)
router.delete('/clear-all', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), ssh_controller_1.clearAllSsh);
exports.default = router;
//# sourceMappingURL=ssh.routes.js.map