import api from './api';
import { ApiResponse } from '../types';

export interface BackupItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: { name: string };
  } | null;
}

export interface ExcelBackupItem {
  filename: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  isLatest: boolean;
}

export const backupService = {
  getBackups: async () => {
    const { data } = await api.get<ApiResponse<BackupItem[]>>('/backups');
    return data;
  },

  createBackup: async () => {
    const { data } = await api.post<ApiResponse<BackupItem>>('/backups/create');
    return data;
  },

  // ─── Excel Database Backup API ────────────────────────────────
  getExcelBackups: async () => {
    const { data } = await api.get<ApiResponse<ExcelBackupItem[]>>('/backups/excel/list');
    return data;
  },

  createExcelBackup: async () => {
    const { data } = await api.post<ApiResponse<{
      savedFiles: string[];
      filename: string;
      sizeBytes: number;
      sizeFormatted: string;
      timestamp: string;
    }>>('/backups/excel/create');
    return data;
  },

  downloadExcelBackup: async () => {
    const response = await api.get('/backups/excel/download', {
      responseType: 'blob',
    });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `DATABASE_KEUANGAN_YAYASAN_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
  },

  openBackupFolder: async () => {
    const { data } = await api.post<ApiResponse<{ path: string }>>('/backups/excel/open-folder');
    return data;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get<
      ApiResponse<{
        items: AuditLogItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>
    >('/backups/audit-logs', { params });
    return data;
  },
};
