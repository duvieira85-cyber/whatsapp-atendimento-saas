import api from './api';
import type { AuthResponse, LoginCredentials, User } from '../types';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login/', credentials);
  return response.data;
}

export async function refreshToken(refresh: string): Promise<{ access: string; refresh: string }> {
  const response = await api.post('/auth/refresh/', { refresh });
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me/');
  return response.data;
}

export async function listUsers(params?: Record<string, unknown>): Promise<{ results: User[]; count: number }> {
  const response = await api.get('/auth/users/', { params });
  return response.data;
}

export async function createUser(data: Partial<User> & { password: string }): Promise<User> {
  const response = await api.post<User>('/auth/users/', data);
  return response.data;
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const response = await api.patch<User>(`/auth/users/${id}/`, data);
  return response.data;
}
