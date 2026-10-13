import api from './api';
import { ApiResponse, FiscalYear } from '../types';

export const fiscalYearsService = {
  getAll: async () => {
    const { data } = await api.get<ApiResponse<FiscalYear[]>>('/fiscal-years');
    return data;
  },

  getActive: async () => {
    const { data } = await api.get<ApiResponse<FiscalYear | null>>('/fiscal-years/active');
    return data;
  },

  create: async (payload: { year: number; notes?: string }) => {
    const { data } = await api.post<ApiResponse<FiscalYear>>('/fiscal-years', payload);
    return data;
  },

  update: async (id: number, payload: { notes?: string }) => {
    const { data } = await api.put<ApiResponse<FiscalYear>>(`/fiscal-years/${id}`, payload);
    return data;
  },

  setActive: async (id: number) => {
    const { data } = await api.patch<ApiResponse<FiscalYear>>(`/fiscal-years/${id}/set-active`);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await api.delete<ApiResponse>(`/fiscal-years/${id}`);
    return data;
  },
};
