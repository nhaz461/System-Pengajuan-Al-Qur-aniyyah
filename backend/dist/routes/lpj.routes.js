"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lpj_controller_1 = require("../controllers/lpj.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Daftar Pengajuan untuk LPJ
router.get('/', lpj_controller_1.getLpjSubmissions);
// Detail Workspace Realisasi Belanja & LPJ
router.get('/:id', lpj_controller_1.getLpjDetail);
// Submit LPJ Realisasi Belanja oleh Unit atau Admin
router.post('/:id/submit', lpj_controller_1.submitLpj);
// Verifikasi LPJ oleh Bagian Keuangan atau Admin
router.post('/:id/verify', (0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'), lpj_controller_1.verifyLpj);
// Lembar Dokumen LPJ Resmi Yayasan
router.get('/:id/lembar-lpj', lpj_controller_1.getLembarLpj);
exports.default = router;
//# sourceMappingURL=lpj.routes.js.map