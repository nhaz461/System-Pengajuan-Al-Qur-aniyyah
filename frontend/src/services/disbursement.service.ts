import api from './api';
import { ApiResponse, SubmissionListItem, SubmissionDetail } from '../types';

export interface DisbursementStats {
  totalApproved: number;
  totalDisbursed: number;
  sisaBelumCair: number;
}

export interface DisbursementDetailResponse {
  submission: SubmissionDetail & {
    disbursements?: Array<{
      id: number;
      amount: number;
      paymentMethod: string;
      bankName?: string | null;
      accountNumber?: string | null;
      recipientName: string;
      referenceNumber?: string | null;
      receiptFile?: string | null;
      notes?: string | null;
      disbursedAt: string;
      disbursedBy?: { id: number; name: string };
    }>;
  };
  stats: DisbursementStats;
}

export interface KuitansiData {
  institution: string;
  address: string;
  city: string;
  receiptNumber: string;
  submissionNumber: string;
  date: string;
  unit: string;
  activity: string;
  title: string;
  amount: number;
  paymentMethod: string;
  bankName?: string | null;
  accountNumber?: string | null;
  recipientName: string;
  notes?: string | null;
  disbursedBy: string;
  approvedBy: string;
}

export interface SppdItem {
  no: number;
  itemNumber: number;
  kategori: string;
  kebutuhan: string;
  satuan: string;
  volume: number;
  pengajuanHarga: number;
  pengajuanRincian: string;
  pengajuanTotal: number;
  pencairanHarga: number;
  pencairanRincian: string;
  pencairanTotal: number;
  keterangan?: string | null;
  sshStatus?: string | null;
}

export interface SppdData {
  institution: string;
  subInstitution: string;
  academicYear: string;
  submissionNumber: string;
  letterNumber: string;
  activityDate: string;
  disbursementDate: string;
  unit: string;
  unitCode: string;
  activity: string;
  title: string;
  status: string;
  summary: {
    totalPengajuan: number;
    totalPencairan: number;
    totalDisbursed: number;
    selisihEfisiensi: number;
  };
  items: SppdItem[];
  signatories: {
    pemohon: { nama: string; jabatan: string };
    keuangan: { nama: string; jabatan: string };
    pimpinan: { nama: string; jabatan: string };
  };
}

export const disbursementService = {
  getSubmissions: async (params?: {
    unitId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<
      ApiResponse<{
        items: SubmissionListItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >('/disbursements', { params });
    return data;
  },

  getDetail: async (id: number) => {
    const { data } = await api.get<ApiResponse<DisbursementDetailResponse>>(
      `/disbursements/${id}`
    );
    return data;
  },

  disburse: async (id: number, formData: FormData) => {
    const { data } = await api.post<ApiResponse<any>>(
      `/disbursements/${id}/disburse`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  getKuitansi: async (id: number) => {
    const { data } = await api.get<ApiResponse<KuitansiData>>(
      `/disbursements/${id}/kuitansi`
    );
    return data;
  },

  getSppd: async (id: number) => {
    const { data } = await api.get<ApiResponse<SppdData>>(
      `/disbursements/${id}/sppd`
    );
    return data;
  },
};
