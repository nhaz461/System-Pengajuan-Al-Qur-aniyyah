import { Router } from 'express';
import {
  getApprovalSubmissions,
  getApprovalDetail,
  decideApproval,
  getLembarPengesahan,
} from '../controllers/approval.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'KEUANGAN', 'PIMPINAN', 'BENDAHARA'));

// Daftar Pengajuan untuk Persetujuan Pimpinan
router.get('/', getApprovalSubmissions);

// Detail Workspace Persetujuan Pimpinan
router.get('/:id', getApprovalDetail);

// Keputusan Persetujuan Pimpinan (SETUJU, TOLAK, REVISI)
router.post('/:id/decide', decideApproval);

// Lembar Pengesahan Resmi Yayasan
router.get('/:id/lembar-pengesahan', getLembarPengesahan);

export default router;
