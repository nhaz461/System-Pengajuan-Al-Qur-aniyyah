import api from './api';
import { ApiResponse, Activity } from '../types';

export const activitiesService = {
  getAll: async (isActive?: boolean) => {
    const params = isActive !== undefined ? { isActive } : {};
    const { data } = await api.get<ApiResponse<Activity[]>>('/activities', { params });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Activity>>(`/activities/${id}`);
    return data;
  },

  create: async (payload: { name: string; description?: string }) => {
    const { data } = await api.post<ApiResponse<Activity>>('/activities', payload);
    return data;
  },

  update: async (id: number, payload: { name?: string; description?: string }) => {
    const { data } = await api.put<ApiResponse<Activity>>(`/activities/${id}`, payload);
    return data;
  },

  toggleActive: async (id: number) => {
    const { data } = await api.patch<ApiResponse<Activity>>(`/activities/${id}/toggle-active`);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete<ApiResponse>(`/activities/${id}`);
    return data;
  },
};
