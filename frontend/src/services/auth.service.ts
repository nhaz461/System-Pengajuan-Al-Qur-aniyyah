import api from './api';
import { ApiResponse, User } from '../types';

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post<ApiResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },
};
