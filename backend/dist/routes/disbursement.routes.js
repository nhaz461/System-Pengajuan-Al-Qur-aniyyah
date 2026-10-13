"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const disbursement_controller_1 = require("../controllers/disbursement.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'));
// Daftar Pengajuan Siap Dicairkan & Riwayat Pencairan
router.get('/', disbursement_controller_1.getDisbursementSubmissions);
// Detail Workspace Pencairan Dana
router.get('/:id', disbursement_controller_1.getDisbursementDetail);
// Eksekusi Pencairan Dana (Upload Bukti Transfer / Kuitansi)
router.post('/:id/disburse', upload_middleware_1.uploadReceipt.single('receipt'), disbursement_controller_1.executeDisbursement);
// Data Kuitansi Resmi Pencairan Dana
router.get('/:id/kuitansi', disbursement_controller_1.getKuitansiPencairan);
// Data Surat Perintah Pencairan Dana (SPPD) & Lembar Review/Print
router.get('/:id/sppd', disbursement_controller_1.getSppdData);
exports.default = router;
//# sourceMappingURL=disbursement.routes.js.map