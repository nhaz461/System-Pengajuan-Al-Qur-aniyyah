import api from './api';
import {
  ApiResponse,
  SubmissionListItem,
  SubmissionDetail,
  SubmissionPreviewResponse,
} from '../types';

export const submissionsService = {
  preview: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<ApiResponse<SubmissionPreviewResponse>>(
      '/submissions/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  create: async (payload: {
    unitId: number;
    activityId: number;
    fiscalYearId: number;
    title: string;
    activityDate?: string;
    picName?: string;
    notes?: string;
    tempFilePath?: string;
    filename?: string;
    items?: any[];
    totalExcel?: number;
    totalParsing?: number;
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/submissions', payload);
    return data;
  },

  getAll: async (params?: {
    unitId?: number;
    activityId?: number;
    fiscalYearId?: number;
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
    >('/submissions', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<SubmissionDetail>>(`/submissions/${id}`);
    return data;
  },

  downloadTemplateUrl: () => {
    return '/api/submissions/template/download';
  },

  delete: async (id: number) => {
    const { data } = await api.delete<ApiResponse<any>>(`/submissions/${id}`);
    return data;
  },

  updateWorkflowStatus: async (
    id: number,
    payload: {
      status?: string;
      notes?: string;
      disbursementAmount?: number;
      disbursementDate?: string;
      paymentMethod?: string;
      bankName?: string;
      accountNumber?: string;
      recipientName?: string;
    }
  ) => {
    const { data } = await api.patch<ApiResponse<any>>(`/submissions/${id}/workflow-status`, payload);
    return data;
  },

  update: async (id: number, payload: any) => {
    const { data } = await api.put<ApiResponse<any>>(`/submissions/${id}`, payload);
    return data;
  },
};
