"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const submissions_controller_1 = require("../controllers/submissions.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
// Download template resmi (bisa diakses publik atau setelah login)
router.get('/template/download', submissions_controller_1.downloadSubmissionTemplate);
router.use(auth_middleware_1.authenticate);
// List pengajuan (Section R: No Pengajuan | Unit | Kegiatan | Total Anggaran | Realisasi | Status)
router.get('/', submissions_controller_1.getSubmissions);
// Preview Excel sebelum disimpan (Section F & G)
router.post('/preview', upload_middleware_1.uploadExcel.single('file'), submissions_controller_1.previewSubmission);
// Simpan pengajuan ke database setelah konfirmasi user (Section F)
router.post('/', submissions_controller_1.createSubmission);
// Detail pengajuan
router.get('/:id', submissions_controller_1.getSubmissionDetail);
exports.default = router;
//# sourceMappingURL=submissions.routes.js.map