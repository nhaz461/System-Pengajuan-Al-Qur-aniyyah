// ─── Auth Types ─────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'UNIT' | 'KEUANGAN' | 'PIMPINAN';
  unit: { id: number; name: string; code: string } | null;
  isActive?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Unit Types ──────────────────────────────────────────────
export interface Unit {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

// ─── Activity Types ───────────────────────────────────────────
export interface Activity {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Fiscal Year Types ────────────────────────────────────────
export interface FiscalYear {
  id: number;
  year: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Types ───────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// ─── Pagination ───────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Dashboard Types ──────────────────────────────────────────
export interface DashboardSummary {
  units: number;
  activities: number;
  fiscalYears: number;
  users: number;
  activeFiscalYear: number | null;
  totalPengajuan: number;
  totalAnggaran: number;
  totalReview: number;
  totalApproved: number;
  totalPencairan: number;
  totalRealisasi: number;
  totalSisa: number;
}

// ─── SSH Types ────────────────────────────────────────────────
export interface SshItem {
  id: number;
  sshVersionId: number;
  kode: string | null;
  kategori: string;
  uraian: string;
  satuan: string;
  hargaSsh: number;
  status: string;
  keterangan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SshVersion {
  id: number;
  version: string;
  filename: string;
  totalItems: number;
  isActive: boolean;
  importedById: number;
  importedAt: string;
  notes?: string | null;
  importedBy?: {
    id: number;
    name: string;
    email: string;
  };
  _count?: {
    items: number;
  };
}

export interface SshMasterStatus {
  hasMaster: boolean;
  id: number | null;
  version: string | null;
  filename: string | null;
  importedAt: string | null;
  totalItems: number;
  importedBy: {
    id: number;
    name: string;
    email: string;
  } | null;
  notes?: string | null;
}

export interface SshPreviewItem {
  no: number;
  kode: string | null;
  kategori: string;
  uraian: string;
  satuan: string;
  hargaSsh: number;
  keterangan: string | null;
}

export interface SshPreviewResponse {
  tempFilePath: string;
  filename: string;
  sheetName: string;
  totalItems: number;
  sampleItems: SshPreviewItem[];
  allItems: SshPreviewItem[];
  alreadyExists: boolean;
  currentActiveVersion: {
    id: number;
    version: string;
    filename: string;
    importedAt: string;
    totalItems: number;
    importedBy: string;
  } | null;
  suggestedVersion: string;
}

// ─── Submission Types ─────────────────────────────────────────
export type SubmissionStatus =
  | 'DRAFT'
  | 'MENUNGGU_REVIEW'
  | 'DALAM_REVIEW'
  | 'PERLU_REVISI'
  | 'REVIEW_SELESAI'
  | 'MENUNGGU_APPROVAL'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'MENUNGGU_PENCAIRAN'
  | 'DICAIRKAN'
  | 'MENUNGGU_VERIFIKASI_LPJ'
  | 'PERLU_REVISI_LPJ'
  | 'SELESAI';

export interface SubmissionItem {
  id: number;
  submissionId: number;
  itemNumber: number;
  kategori: string;
  uraian: string;
  hargaSatuan: number;
  volume: number;
  satuan: string;
  jumlah: number;
  keterangan: string | null;
  originalPrice: number;
  reviewPrice?: number | null;
  sshPrice?: number | null;
  sshStatus?: string | null;
  sshItemId?: number | null;
  reviewNote?: string | null;
  sshItem?: {
    id: number;
    kode: string | null;
    uraian: string;
    hargaSsh: number;
    satuan: string;
  } | null;
}

export interface SubmissionListItem {
  id: number;
  submissionNumber: string;
  unit: string;
  unitCode: string;
  activity: string;
  fiscalYear: number;
  title: string;
  activityDate?: string | null;
  picName?: string | null;
  totalAnggaran: number;
  totalExcel: number;
  totalParsing?: number;
  totalReviewed?: number | null;
  totalApproved?: number | null;
  totalDisbursed?: number | null;
  selisih: number;
  realisasi: number;
  status: SubmissionStatus;
  submittedBy: string;
  submittedAt: string;
  itemsCount?: number;
}

export interface SubmissionDetail {
  id: number;
  submissionNumber: string;
  unitId: number;
  activityId: number;
  fiscalYearId: number;
  title: string;
  activityDate?: string | null;
  picName?: string | null;
  originalFilename: string;
  filePath?: string | null;
  totalExcel: number;
  totalParsing: number;
  selisih: number;
  totalReviewed?: number | null;
  totalApproved?: number | null;
  totalDisbursed?: number | null;
  totalRealized?: number | null;
  status: SubmissionStatus;
  submittedById: number;
  submittedAt: string;
  notes?: string | null;
  approvalNotes?: string | null;
  unit: { id: number; name: string; code: string };
  activity: { id: number; name: string };
  fiscalYear: { id: number; year: number };
  submittedBy: { id: number; name: string; email: string };
  approvedBy?: { id: number; name: string; email: string } | null;
  disbursedBy?: { id: number; name: string; email: string } | null;
  items: SubmissionItem[];
  reviews?: Array<{
    id: number;
    action: string;
    notes?: string | null;
    createdAt: string;
    reviewer: { id: number; name: string };
  }>;
}

export interface SubmissionPreviewItem {
  no: number;
  kategori: string;
  uraian: string;
  hargaSatuan: number;
  volume: number;
  satuan: string;
  jumlah: number;
  keterangan: string | null;
  rincianVolume?: string | null;
}

export interface SubmissionPreviewResponse {
  tempFilePath: string;
  filename: string;
  sheetName: string;
  totalItems: number;
  totalExcel: number;
  totalParsing: number;
  selisih: number;
  hasMismatch: boolean;
  mismatchWarning?: string;
  detectedUnit?: string;
  detectedActivity?: string;
  items: SubmissionPreviewItem[];
}

// ─── Review Types ─────────────────────────────────────────────
export interface ReviewStats {
  totalOriginal: number;
  totalReviewed: number;
  selisihEfisiensi: number;
  countSesuaiSsh: number;
  countMelebihiSsh: number;
  countPerluCek: number;
  countTidakAdaSsh: number;
  totalItems: number;
}

export interface ReviewDetailResponse {
  submission: SubmissionDetail & {
    reviews: {
      id: number;
      action: string;
      notes: string | null;
      createdAt: string;
      reviewer: { id: number; name: string; email: string };
    }[];
  };
  stats: ReviewStats;
  sshMasterItems: {
    id: number;
    kode: string | null;
    kategori: string;
    uraian: string;
    satuan: string;
    hargaSsh: number;
  }[];
  activeSshVersion: string | null;
}



