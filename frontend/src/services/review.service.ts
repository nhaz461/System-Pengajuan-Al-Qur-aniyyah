import api from './api';
import {
  ApiResponse,
  SubmissionListItem,
  SubmissionItem,
  ReviewDetailResponse,
} from '../types';

export const reviewService = {
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
    >('/reviews', { params });
    return data;
  },

  getDetail: async (submissionId: number) => {
    const { data } = await api.get<ApiResponse<ReviewDetailResponse>>(
      `/reviews/${submissionId}`
    );
    return data;
  },

  startReview: async (submissionId: number) => {
    const { data } = await api.post<ApiResponse<any>>(
      `/reviews/${submissionId}/start`
    );
    return data;
  },

  updateItem: async (
    itemId: number,
    payload: {
      reviewPrice?: number | null;
      reviewNote?: string;
      sshItemId?: number | null;
      volume?: number;
      keterangan?: string;
    }
  ) => {
    const { data } = await api.patch<
      ApiResponse<{
        item: SubmissionItem;
        totalReviewed: number;
      }>
    >(`/reviews/items/${itemId}`, payload);
    return data;
  },

  applyAllSsh: async (submissionId: number) => {
    const { data } = await api.post<
      ApiResponse<{
        totalReviewed: number;
        updatedCount: number;
      }>
    >(`/reviews/${submissionId}/apply-all-ssh`);
    return data;
  },

  finishReview: async (
    submissionId: number,
    payload: {
      action: 'APPROVE_TO_LEADERSHIP' | 'REQUEST_REVISION';
      notes?: string;
    }
  ) => {
    const { data } = await api.post<ApiResponse<any>>(
      `/reviews/${submissionId}/finish`,
      payload
    );
    return data;
  },

  getSshCandidates: async (itemId: number, search?: string) => {
    const { data } = await api.get<
      ApiResponse<{
        item: SubmissionItem;
        candidates: Array<{
          item: any;
          score: number;
          status: 'SESUAI_SSH' | 'MELEBIHI_SSH' | 'PERLU_CEK';
        }>;
        activeVersion: string | null;
      }>
    >(`/reviews/items/${itemId}/ssh-candidates`, { params: { search } });
    return data;
  },
};
