import api from './api';
import { ApiResponse, SubmissionListItem, SubmissionDetail } from '../types';

export interface LpjStats {
  totalDisbursed: number;
  totalRealized: number;
  sisa: number;
  isSisaLebih: boolean;
  isSisaKurang: boolean;
  isNihil: boolean;
}

export interface LpjItemPayload {
  submissionItemId?: number | null;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  total?: number;
  notaNumber?: string;
  notaFile?: string;
  keterangan?: string;
}

export interface LpjDetailResponse {
  submission: SubmissionDetail & {
    lpjItems?: Array<{
      id: number;
      uraian: string;
      volume: number;
      satuan: string;
      hargaSatuan: number;
      total: number;
      notaNumber?: string | null;
      notaFile?: string | null;
      keterangan?: string | null;
    }>;
  };
  stats: LpjStats;
}

export interface LembarLpjData {
  institution: string;
  address: string;
  city: string;
  documentTitle: string;
  documentNumber: string;
  printDate: string;
  submission: SubmissionDetail & {
    lpjItems?: Array<{
      id: number;
      uraian: string;
      volume: number;
      satuan: string;
      hargaSatuan: number;
      total: number;
      notaNumber?: string | null;
      keterangan?: string | null;
    }>;
  };
  summary: {
    totalDisbursed: number;
    totalRealized: number;
    sisa: number;
    sisaStatus: string;
  };
  signatories: {
    pelaksana: { jabatan: string; nama: string };
    verifikator: { jabatan: string; nama: string };
    mengetahui: { jabatan: string; nama: string };
  };
}

export const lpjService = {
  getSubmissions: async (params?: {
    unitId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<
      ApiResponse<{
        items: Array<
          SubmissionListItem & {
            totalRealized?: number;
            sisaLebihKurang?: number;
            lpjStatus?: string;
          }
        >;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >('/lpj', { params });
    return data;
  },

  getDetail: async (id: number) => {
    const { data } = await api.get<ApiResponse<LpjDetailResponse>>(`/lpj/${id}`);
    return data;
  },

  submitLpj: async (
    id: number,
    payload: {
      items: LpjItemPayload[];
      notes?: string;
    }
  ) => {
    const { data } = await api.post<ApiResponse<any>>(`/lpj/${id}/submit`, payload);
    return data;
  },

  verifyLpj: async (
    id: number,
    payload: {
      action: 'ACCEPT' | 'REVISION';
      notes?: string;
    }
  ) => {
    const { data } = await api.post<ApiResponse<any>>(`/lpj/${id}/verify`, payload);
    return data;
  },

  getLembarLpj: async (id: number) => {
    const { data } = await api.get<ApiResponse<LembarLpjData>>(`/lpj/${id}/lembar-lpj`);
    return data;
  },
};
