"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const approval_controller_1 = require("../controllers/approval.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN', 'PIMPINAN', 'BENDAHARA'));
// Daftar Pengajuan untuk Persetujuan Pimpinan
router.get('/', approval_controller_1.getApprovalSubmissions);
// Detail Workspace Persetujuan Pimpinan
router.get('/:id', approval_controller_1.getApprovalDetail);
// Keputusan Persetujuan Pimpinan (SETUJU, TOLAK, REVISI)
router.post('/:id/decide', approval_controller_1.decideApproval);
// Lembar Pengesahan Resmi Yayasan
router.get('/:id/lembar-pengesahan', approval_controller_1.getLembarPengesahan);
exports.default = router;
//# sourceMappingURL=approval.routes.js.map