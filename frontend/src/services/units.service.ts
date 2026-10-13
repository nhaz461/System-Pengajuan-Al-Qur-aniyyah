import api from './api';
import { ApiResponse, Unit } from '../types';

export const unitsService = {
  getAll: async (isActive?: boolean) => {
    const params = isActive !== undefined ? { isActive } : {};
    const { data } = await api.get<ApiResponse<Unit[]>>('/units', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Unit>>(`/units/${id}`);
    return data;
  },

  create: async (payload: { name: string; code: string; description?: string }) => {
    const { data } = await api.post<ApiResponse<Unit>>('/units', payload);
    return data;
  },

  update: async (id: number, payload: { name?: string; code?: string; description?: string }) => {
    const { data } = await api.put<ApiResponse<Unit>>(`/units/${id}`, payload);
    return data;
  },

  toggleActive: async (id: number) => {
    const { data } = await api.patch<ApiResponse<Unit>>(`/units/${id}/toggle-active`);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete<ApiResponse>(`/units/${id}`);
    return data;
  },
};
