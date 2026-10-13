import { Router } from 'express';
import {
  previewSsh,
  confirmImportSsh,
  getActiveSshStatus,
  getSshItems,
  createSshItem,
  updateSshItem,
  deleteSshItem,
  getSshVersions,
  setActiveSshVersion,
  deleteSshVersion,
  downloadSshTemplate,
  clearAllSsh,
} from '../controllers/ssh.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadExcel } from '../middleware/upload.middleware';

const router = Router();

// Download template resmi Master SSH (dapat diakses sebelum auth atau oleh browser langsung)
router.get('/template/download', downloadSshTemplate);

router.use(authenticate);

// Status Master SSH (dapat dilihat oleh semua yang login)
router.get('/status', getActiveSshStatus);

// Query items dari database (dapat dilihat oleh semua role)
router.get('/items', getSshItems);

// Tambah Item SSH Baru (Admin & Keuangan)
router.post('/items', authorize('ADMIN', 'KEUANGAN'), createSshItem);

// Edit Item SSH (Admin & Keuangan)
router.put('/items/:id', authorize('ADMIN', 'KEUANGAN'), updateSshItem);
router.patch('/items/:id', authorize('ADMIN', 'KEUANGAN'), updateSshItem);

// Hapus Item SSH (Admin & Keuangan)
router.delete('/items/:id', authorize('ADMIN', 'KEUANGAN'), deleteSshItem);

// Preview Excel SSH (Admin & Keuangan)
router.post(
  '/preview',
  authorize('ADMIN', 'KEUANGAN'),
  uploadExcel.single('file'),
  previewSsh
);

// Konfirmasi Simpan ke Database (Admin & Keuangan)
router.post(
  '/import',
  authorize('ADMIN', 'KEUANGAN'),
  confirmImportSsh
);

// Histori Versi SSH (Admin & Keuangan)
router.get('/versions', authorize('ADMIN', 'KEUANGAN'), getSshVersions);

// Set Versi Aktif (Admin only)
router.patch('/versions/:id/set-active', authorize('ADMIN'), setActiveSshVersion);

// Hapus Versi Nonaktif (Admin only)
router.delete('/versions/:id', authorize('ADMIN'), deleteSshVersion);

// Kosongkan seluruh database Master SSH (Admin & Keuangan)
router.delete('/clear-all', authorize('ADMIN', 'KEUANGAN'), clearAllSsh);

export default router;
