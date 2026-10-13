import api from './api';
import {
  ApiResponse,
  SshMasterStatus,
  SshItem,
  SshVersion,
  SshPreviewResponse,
} from '../types';

export const sshService = {
  getStatus: async () => {
    const { data } = await api.get<ApiResponse<SshMasterStatus>>('/ssh/status');
    return data;
  },

  getItems: async (params?: {
    versionId?: number;
    search?: string;
    kategori?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<
      ApiResponse<{
        items: SshItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        categories: string[];
        version: {
          id: number;
          version: string;
          filename: string;
          importedAt: string;
          totalItems: number;
          importedBy: string;
        } | null;
      }>
    >('/ssh/items', { params });
    return data;
  },

  preview: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post<ApiResponse<SshPreviewResponse>>(
      '/ssh/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  confirmImport: async (payload: {
    tempFilePath?: string;
    filename: string;
    version: string;
    notes?: string;
    items?: any[];
  }) => {
    const { data } = await api.post<ApiResponse<any>>('/ssh/import', payload);
    return data;
  },

  getVersions: async () => {
    const { data } = await api.get<ApiResponse<SshVersion[]>>('/ssh/versions');
    return data;
  },

  setActiveVersion: async (id: number) => {
    const { data } = await api.patch<ApiResponse<SshVersion>>(
      `/ssh/versions/${id}/set-active`
    );
    return data;
  },

  deleteVersion: async (id: number) => {
    const { data } = await api.delete<ApiResponse>(`/ssh/versions/${id}`);
    return data;
  },

  getTemplateDownloadUrl: () => {
    return '/api/ssh/template/download';
  },

  clearAll: async () => {
    const { data } = await api.delete<ApiResponse<{ deletedItems: number; deletedVersions: number }>>('/ssh/clear-all');
    return data;
  },

  createItem: async (payload: {
    versionId?: number;
    kode?: string;
    kategori: string;
    uraian: string;
    satuan: string;
    hargaSsh: number;
    keterangan?: string;
    status?: string;
  }) => {
    const { data } = await api.post<ApiResponse<SshItem>>('/ssh/items', payload);
    return data;
  },

  updateItem: async (
    id: number,
    payload: {
      kode?: string;
      kategori?: string;
      uraian?: string;
      satuan?: string;
      hargaSsh?: number;
      keterangan?: string;
      status?: string;
    }
  ) => {
    const { data } = await api.put<ApiResponse<SshItem>>(`/ssh/items/${id}`, payload);
    return data;
  },

  deleteItem: async (id: number) => {
    const { data } = await api.delete<ApiResponse>(`/ssh/items/${id}`);
    return data;
  },
};
