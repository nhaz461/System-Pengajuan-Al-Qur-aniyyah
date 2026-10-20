import { Router } from 'express';
import {
  previewSubmission,
  createSubmission,
  getSubmissions,
  getSubmissionDetail,
  downloadSubmissionTemplate,
  deleteSubmission,
} from '../controllers/submissions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadExcel } from '../middleware/upload.middleware';

const router = Router();

// Download template resmi (bisa diakses publik atau setelah login)
router.get('/template/download', downloadSubmissionTemplate);

router.use(authenticate);

// List pengajuan (Section R: No Pengajuan | Unit | Kegiatan | Total Anggaran | Realisasi | Status)
router.get('/', getSubmissions);

// Preview Excel sebelum disimpan (Section F & G)
router.post('/preview', uploadExcel.single('file'), previewSubmission);

// Simpan pengajuan ke database setelah konfirmasi user (Section F)
router.post('/', createSubmission);

// Detail pengajuan
router.get('/:id', getSubmissionDetail);

// Hapus pengajuan
router.delete('/:id', deleteSubmission);

export default router;
