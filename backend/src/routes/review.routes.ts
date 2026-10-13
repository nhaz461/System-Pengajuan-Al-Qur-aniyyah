import { Router } from 'express';
import {
  getReviewSubmissions,
  getReviewDetail,
  startReview,
  updateReviewItem,
  applyAllSsh,
  finishReview,
  getSshCandidates,
} from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'KEUANGAN'));

// Daftar Pengajuan untuk Review
router.get('/', getReviewSubmissions);

// Detail Workspace Review Keuangan (dengan SSH Matching otomatis)
router.get('/:submissionId', getReviewDetail);

// Mulai Review (Ubah status ke DALAM_REVIEW)
router.post('/:submissionId/start', startReview);

// Inline update harga review & catatan (Section L)
router.patch('/items/:itemId', updateReviewItem);

// Rekomendasi item SSH paling mirip & Live Search SSH untuk item tertentu
router.get('/items/:itemId/ssh-candidates', getSshCandidates);

// Helper aksi cepat: Sesuaikan semua harga melebihi ke harga SSH
router.post('/:submissionId/apply-all-ssh', applyAllSsh);

// Selesaikan Review (Teruskan ke Pimpinan atau Minta Revisi)
router.post('/:submissionId/finish', finishReview);

export default router;
