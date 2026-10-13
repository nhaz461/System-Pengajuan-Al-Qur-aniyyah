"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('ADMIN', 'KEUANGAN'));
// Daftar Pengajuan untuk Review
router.get('/', review_controller_1.getReviewSubmissions);
// Detail Workspace Review Keuangan (dengan SSH Matching otomatis)
router.get('/:submissionId', review_controller_1.getReviewDetail);
// Mulai Review (Ubah status ke DALAM_REVIEW)
router.post('/:submissionId/start', review_controller_1.startReview);
// Inline update harga review & catatan (Section L)
router.patch('/items/:itemId', review_controller_1.updateReviewItem);
// Rekomendasi item SSH paling mirip & Live Search SSH untuk item tertentu
router.get('/items/:itemId/ssh-candidates', review_controller_1.getSshCandidates);
// Helper aksi cepat: Sesuaikan semua harga melebihi ke harga SSH
router.post('/:submissionId/apply-all-ssh', review_controller_1.applyAllSsh);
// Selesaikan Review (Teruskan ke Pimpinan atau Minta Revisi)
router.post('/:submissionId/finish', review_controller_1.finishReview);
exports.default = router;
//# sourceMappingURL=review.routes.js.map