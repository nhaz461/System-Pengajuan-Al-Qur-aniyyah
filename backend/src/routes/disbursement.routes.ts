import { Router } from 'express';
import {
  getDisbursementSubmissions,
  getDisbursementDetail,
  executeDisbursement,
  getKuitansiPencairan,
  getSppdData,
} from '../controllers/disbursement.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadReceipt } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'KEUANGAN'));

// Daftar Pengajuan Siap Dicairkan & Riwayat Pencairan
router.get('/', getDisbursementSubmissions);

// Detail Workspace Pencairan Dana
router.get('/:id', getDisbursementDetail);

// Eksekusi Pencairan Dana (Upload Bukti Transfer / Kuitansi)
router.post('/:id/disburse', uploadReceipt.single('receipt'), executeDisbursement);

// Data Kuitansi Resmi Pencairan Dana
router.get('/:id/kuitansi', getKuitansiPencairan);

// Data Surat Perintah Pencairan Dana (SPPD) & Lembar Review/Print
router.get('/:id/sppd', getSppdData);

export default router;
