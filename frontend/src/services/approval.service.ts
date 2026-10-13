import api from './api';
import { ApiResponse, SubmissionListItem, SubmissionDetail } from '../types';

export interface ApprovalStats {
  totalOriginal: number;
  totalReviewed: number;
  totalApproved: number;
  selisihReview: number;
  selisihApproved: number;
  itemCount: number;
  countSesuai: number;
  countMelebihi: number;
  countTidakAda: number;
}

export interface ApprovalDetailResponse {
  submission: SubmissionDetail;
  stats: ApprovalStats;
}

export interface LembarPengesahanData {
  header: {
    institution: string;
    address: string;
    city: string;
    documentTitle: string;
    documentNumber: string;
    printDate: string;
  };
  submission: SubmissionDetail;
  signatories: {
    pemohon: {
      jabatan: string;
      nama: string;
      tanggal: string;
    };
    keuangan: {
      jabatan: string;
      nama: string;
    };
    pimpinan: {
      jabatan: string;
      nama: string;
      tanggal?: string;
      status: string;
      notes?: string;
    };
  };
}

export const approvalService = {
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
    >('/approvals', { params });
    return data;
  },

  getDetail: async (id: number) => {
    const { data } = await api.get<ApiResponse<ApprovalDetailResponse>>(
      `/approvals/${id}`
    );
    return data;
  },

  decide: async (
    id: number,
    payload: {
      action: 'APPROVE' | 'REJECT' | 'REVISION';
      approvedAmount?: number;
      notes?: string;
    }
  ) => {
    const { data } = await api.post<ApiResponse<any>>(
      `/approvals/${id}/decide`,
      payload
    );
    return data;
  },

  getLembarPengesahan: async (id: number) => {
    const { data } = await api.get<ApiResponse<LembarPengesahanData>>(
      `/approvals/${id}/lembar-pengesahan`
    );
    return data;
  },
};
