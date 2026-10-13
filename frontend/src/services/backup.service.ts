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

export const backupService = {
  getBackups: async () => {
    const { data } = await api.get<ApiResponse<BackupItem[]>>('/backups');
    return data;
  },

  createBackup: async () => {
    const { data } = await api.post<ApiResponse<BackupItem>>('/backups/create');
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
