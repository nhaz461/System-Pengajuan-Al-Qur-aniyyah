import { Router } from 'express';
import {
  getLpjSubmissions,
  getLpjDetail,
  submitLpj,
  verifyLpj,
  getLembarLpj,
} from '../controllers/lpj.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Daftar Pengajuan untuk LPJ
router.get('/', getLpjSubmissions);

// Detail Workspace Realisasi Belanja & LPJ
router.get('/:id', getLpjDetail);

// Submit LPJ Realisasi Belanja oleh Unit atau Admin
router.post('/:id/submit', submitLpj);

// Verifikasi LPJ oleh Bagian Keuangan atau Admin
router.post('/:id/verify', authorize('ADMIN', 'KEUANGAN'), verifyLpj);

// Lembar Dokumen LPJ Resmi Yayasan
router.get('/:id/lembar-lpj', getLembarLpj);

export default router;
